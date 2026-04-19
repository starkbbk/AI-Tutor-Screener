/**
 * Mobile-Optimized Speech Engine (v2)
 * 
 * Specifically tuned for iOS Safari and Android Chrome issues:
 * 1. Handoff delays to prevent crash/overlap.
 * 2. Automatic revival of recognition sessions via watchdog.
 * 3. Proactive refresh before 60s browser timeouts.
 * 4. Critical initialization sequence: Stop Audio -> Wait -> Resume Context -> Start Mic.
 */

import { speakWithElevenLabs, stopSpeakingElevenLabs } from "./elevenlabs-speech";
import { getDeviceType } from "./speech-factory";

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

type SpeechCallback = (result: SpeechRecognitionResult) => void;
type EndCallback = (finalTranscript: string) => void;
type ErrorCallback = (error: string) => void;

// Module-level state
let recognition: any = null;
let isListeningActive = false;
let isRecognitionActuallyRunning = false;
let autoReviveCount = 0;
const MAX_AUTO_REVIVE = 5; // Increased for v2

let noSpeechTimer: NodeJS.Timeout | null = null;
let silenceTimer: NodeJS.Timeout | null = null;
let startingGuardTimer: NodeJS.Timeout | null = null;
let keepAliveInterval: NodeJS.Timeout | null = null;
let maxDurationTimeout: NodeJS.Timeout | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

let currentOnResult: SpeechCallback | null = null;
let currentOnEnd: EndCallback | null = null;
let currentOnError: ErrorCallback | null = null;
let isStarting = false;
let fullTranscript = "";
let isTTSPlaying = false;

const device = getDeviceType();

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.speechSynthesis;
}

/**
 * Mobile-specific Mic Unlock & AudioContext Resume
 */
export async function unlockMic(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
  
  console.log("[Mobile] Attempting mic unlock/permission request...");
  try {
    // Force a permission check/grant
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    console.log("[Mobile] Mic permission verified.");
  } catch (err) {
    console.warn("[Mobile] Mic permission check failed:", err);
  }

  // Resume AudioContext for mobile browsers
  if (typeof window !== 'undefined') {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        const tempCtx = new AudioContextClass();
        if (tempCtx.state === 'suspended') {
            await tempCtx.resume();
            console.log("[Mobile] AudioContext resumed.");
        }
    }
  }
}

function clearTimers() {
  if (noSpeechTimer) { clearTimeout(noSpeechTimer); noSpeechTimer = null; }
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  if (startingGuardTimer) { clearTimeout(startingGuardTimer); startingGuardTimer = null; }
  if (keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null; }
  if (maxDurationTimeout) { clearTimeout(maxDurationTimeout); maxDurationTimeout = null; }
}

/**
 * Mobile-specific timeouts (v2)
 */
function startMobileTimeouts() {
  if (noSpeechTimer) clearTimeout(noSpeechTimer);
  if (silenceTimer) clearTimeout(silenceTimer);
  
  if (!isListeningActive) return;

  // No-speech timeout: 8 seconds
  noSpeechTimer = setTimeout(() => {
    if (!fullTranscript.trim() && isListeningActive) {
      console.log("[Mobile] No speech detected for 8s.");
      currentOnResult?.({ transcript: "I didn't catch that. Could you say it again?", isFinal: false });
    }
  }, 8000);

  // Silence timeout: 5 seconds (as requested in v2)
  if (fullTranscript.trim()) {
    silenceTimer = setTimeout(() => {
      if (isListeningActive) {
        console.log("[Mobile] 5s silence detected. Finalizing.");
        stopListening();
      }
    }, 5000);
  }
}

function initRecognition() {
  const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionConstructor) return null;

  const rec = new SpeechRecognitionConstructor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';

  rec.onstart = () => {
    isRecognitionActuallyRunning = true;
    isStarting = false;
    if (startingGuardTimer) clearTimeout(startingGuardTimer);
    console.log("[Mobile] [EVENT] onstart: Mic is now LIVE.");
  };

  rec.onresult = (event: any) => {
    let interimTranscript = '';
    let currentFinalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
            currentFinalTranscript += result[0].transcript;
        } else {
            interimTranscript += result[0].transcript;
        }
    }

    if (currentFinalTranscript) {
        fullTranscript = (fullTranscript + " " + currentFinalTranscript).trim();
        autoReviveCount = 0; 
    }

    const displayTranscript = (fullTranscript + " " + interimTranscript).trim();
    if (currentOnResult) {
        currentOnResult({ transcript: displayTranscript, isFinal: false });
    }

    startMobileTimeouts();
  };

  rec.onerror = (event: any) => {
    console.warn("[Mobile] [EVENT] onerror:", event.error);
    isRecognitionActuallyRunning = false;
    
    const error = event.error;
    
    if (error === 'not-allowed') {
      isListeningActive = false;
      currentOnError?.("Microphone permission denied. Please allow access in settings.");
      return;
    }

    // Auto-restart strategies for mobile-specific errors
    if (isListeningActive) {
        if (error === 'network' || error === 'aborted' || error === 'no-speech') {
            const delay = error === 'network' ? 500 : 0;
            console.log(`[Mobile] Error [${error}] - Restarting immediately...`);
            setTimeout(() => {
                if (isListeningActive) startRecognitionInstance(true);
            }, delay);
        } else if (error === 'audio-capture') {
            console.log("[Mobile] Mic busy - Retrying in 1s...");
            setTimeout(() => {
                if (isListeningActive) startRecognitionInstance(true);
            }, 1000);
        }
    }
  };

  rec.onend = () => {
    isRecognitionActuallyRunning = false;
    console.log("[Mobile] [EVENT] onend. Active?", isListeningActive);
    
    if (isListeningActive && !isTTSPlaying) {
      console.log("[Mobile] Premature end - Restarting instantly.");
      startRecognitionInstance(true);
    }
  };

  return rec;
}

function resetRecognition() {
  if (recognition) {
    try {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.abort();
    } catch (e) {}
    recognition = null;
  }
}

function startRecognitionInstance(forceFresh = true) {
  if (isTTSPlaying || !isListeningActive) return;
  
  // v2: ALWAYS create fresh instance on mobile (crucial for iOS)
  if (forceFresh || !recognition) {
    resetRecognition();
    recognition = initRecognition();
  }

  if (isStarting || !recognition) return;
  isStarting = true;
  
  if (startingGuardTimer) clearTimeout(startingGuardTimer);
  startingGuardTimer = setTimeout(() => {
    if (isStarting) {
      console.log("[Mobile] Watchdog: Start timed out. Retrying fresh...");
      isStarting = false;
      startRecognitionInstance(true);
    }
  }, 2500);

  try {
    recognition.start();
  } catch (e: any) {
    console.warn("[Mobile] Start failed:", e.message);
    isStarting = false;
    if (e.name === 'InvalidStateError') {
      setTimeout(() => startRecognitionInstance(true), 100);
    }
  }
}

/**
 * START LISTENING: v2 Critical Sequence
 */
export async function startListening(
  onResult: SpeechCallback,
  onEnd: EndCallback,
  onError: ErrorCallback
): Promise<void> {
  if (!isSpeechRecognitionSupported()) {
    onError("Speech recognition not supported");
    return;
  }

  console.log("[Mobile] startListening called. Initializing v2 critical sequence.");

  // 1. Sync State
  isListeningActive = true;
  fullTranscript = "";
  autoReviveCount = 0;
  currentOnResult = onResult;
  currentOnEnd = onEnd;
  currentOnError = onError;

  // 2. Clear everything
  clearTimers();
  stopSpeaking(); // Ensure audio is stopped

  // 3. Wait for Handoff (important to let mobile audio system settle)
  const delay = device.handoffDelay;
  console.log(`[Mobile] Handoff delay: ${delay}ms...`);
  
  setTimeout(async () => {
    if (!isListeningActive) return;

    // 4. Resume Context & Request Mic
    await unlockMic();
    
    // 5. Start Keep-Alive (Watchdog)
    keepAliveInterval = setInterval(() => {
        if (isListeningActive && !isRecognitionActuallyRunning && !isStarting && !isTTSPlaying) {
            console.log("[Mobile] Keep-Alive: Detection offline. Reviving...");
            startRecognitionInstance(true);
        }
    }, 500);

    // 6. Max Duration Guard (Refresh every 50s)
    maxDurationTimeout = setTimeout(() => {
        if (isListeningActive) {
            console.log("[Mobile] Max Duration Guard: Proactive refresh to prevent browser kill.");
            startRecognitionInstance(true);
        }
    }, 50000);

    // 7. Initial start
    startMobileTimeouts();
    startRecognitionInstance(true);
  }, delay);
}

export function stopListening(): void {
  const finalTranscript = fullTranscript.trim();
  console.log("[Mobile] stopListening requested. Cleanup active.");
  
  isListeningActive = false;
  isStarting = false;
  isRecognitionActuallyRunning = false;
  clearTimers();
  
  resetRecognition();

  if (currentOnEnd && finalTranscript) {
    currentOnEnd(finalTranscript);
  }
}

export function preloadVoices(): void {
  if (typeof window !== 'undefined') {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
}

export const getPreferredVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = ['Google UK English Female', 'Google US English Female', 'Samantha', 'en-US-Female'];
  for (const name of preferred) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) return voice;
  }
  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
};

export function speak(
  text: string,
  onStart?: (duration?: number) => void,
  onEnd?: () => void
): void {
  const wasListening = isListeningActive;
  
  // v2: Aggressive stop before TTS
  if (wasListening) {
    console.log("[Mobile] speak() called. Disabling mic for TTS stability.");
    isListeningActive = false;
    isRecognitionActuallyRunning = false;
    clearTimers();
    resetRecognition();
  }

  isTTSPlaying = true;
  
  const wrappedOnEnd = () => {
    isTTSPlaying = false;
    onEnd?.();
    
    if (wasListening) {
      console.log("[Mobile] TTS finished. Triggering re-start flow.");
      startListening(currentOnResult!, currentOnEnd!, currentOnError!);
    }
  };

  speakWithElevenLabs(text, onStart, wrappedOnEnd, speakNative);
}

function speakNative(
  text: string,
  onStart?: (duration?: number) => void,
  onEnd?: () => void
): void {
  if (!isSpeechSynthesisSupported()) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  currentUtterance = new SpeechSynthesisUtterance(text);
  const voice = getPreferredVoice();
  if (voice) currentUtterance.voice = voice;
  currentUtterance.lang = 'en-US';
  
  currentUtterance.onstart = () => {
    const words = text.split(/\s+/).length;
    onStart?.((words / 150) * 60);
  };
  currentUtterance.onend = () => {
    onEnd?.();
    currentUtterance = null;
  };
  currentUtterance.onerror = () => {
    onEnd?.();
    currentUtterance = null;
  };

  try {
     window.speechSynthesis.speak(currentUtterance);
  } catch (err) {
    onEnd?.();
  }
}

export function stopSpeaking(): void {
  isTTSPlaying = false;
  stopSpeakingElevenLabs();
  if (typeof window !== 'undefined') {
    window.speechSynthesis.cancel();
  }
}

/**
 * Helper to check if we are in mobile engine via console
 */
(window as any).__SPEECH_ENGINE__ = "MOBILE_V2";

export { startListening as startListeningFinal };
export { startListening as startListeningStandard };
