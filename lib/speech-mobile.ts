/**
 * Mobile-Optimized Speech Engine
 * 
 * Specifically tuned for iOS Safari and Android Chrome issues:
 * 1. Handoff delays to prevent crash/overlap.
 * 2. Automatic revival of recognition sessions.
 * 3. Mobile-specific silence and no-speech timeouts.
 * 4. Explicit microphone unlocking and AudioContext resumption.
 * 5. Aggressive memory cleanup.
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
let autoReviveCount = 0;
const MAX_AUTO_REVIVE = 3;

let noSpeechTimer: NodeJS.Timeout | null = null;
let silenceTimer: NodeJS.Timeout | null = null;
let startingGuardTimer: NodeJS.Timeout | null = null;
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
 * Mobile-specific Mic Unlock
 */
export async function unlockMic(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
  
  console.log("[Mobile Speech] Attempting mic unlock/permission request...");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    console.log("[Mobile Speech] Mic unlocked successfully.");
  } catch (err) {
    console.warn("[Mobile Speech] Mic unlock failed:", err);
  }

  // Resume AudioContext if it exists (for mobile browsers)
  if (typeof window !== 'undefined' && (window as any).AudioContext) {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') {
      await ctx.resume();
      console.log("[Mobile Speech] AudioContext resumed.");
    }
  }
}

function clearTimers() {
  if (noSpeechTimer) { clearTimeout(noSpeechTimer); noSpeechTimer = null; }
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  if (startingGuardTimer) { clearTimeout(startingGuardTimer); startingGuardTimer = null; }
}

/**
 * Mobile-specific timeouts
 */
function startMobileTimeouts() {
  clearTimers();
  if (!isListeningActive) return;

  // No-speech timeout: 8 seconds (if they haven't said ANY words)
  noSpeechTimer = setTimeout(() => {
    if (!fullTranscript.trim() && isListeningActive) {
      console.log("[Mobile Speech] No speech detected for 8s.");
      currentOnResult?.({ transcript: "I didn't catch that. Could you say it again?", isFinal: false });
    }
  }, 8000);

  // Silence timeout: 4 seconds (if they stopped talking)
  // Note: Only triggers if there IS some text
  if (fullTranscript.trim()) {
    silenceTimer = setTimeout(() => {
      if (isListeningActive) {
        console.log("[Mobile Speech] 4s silence detected. Auto-ending.");
        stopListening();
      }
    }, 4000);
  }
}

function initRecognition() {
  const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionConstructor) return null;

  const rec = new SpeechRecognitionConstructor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';

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
      autoReviveCount = 0; // Reset on successful speech
    }

    const displayTranscript = (fullTranscript + " " + interimTranscript).trim();
    if (currentOnResult) {
      currentOnResult({ transcript: displayTranscript, isFinal: false });
    }

    // Refresh timeouts on every result
    startMobileTimeouts();
  };

  rec.onerror = (event: any) => {
    console.warn("[Mobile Speech] Recognition error:", event.error);
    
    // Critical errors that require stopping
    if (event.error === 'not-allowed') {
      isListeningActive = false;
      currentOnError?.("Microphone permission denied. Please allow access in settings.");
      return;
    }

    // Network errors or aborted - attempt auto-restart with backoff
    if (isListeningActive && autoReviveCount < MAX_AUTO_REVIVE) {
      autoReviveCount++;
      const delay = Math.pow(2, autoReviveCount) * 500;
      console.log(`[Mobile Speech] Auto-reviving (attempt ${autoReviveCount}) in ${delay}ms...`);
      setTimeout(() => {
        if (isListeningActive) startRecognitionInstance(true);
      }, delay);
    } else if (autoReviveCount >= MAX_AUTO_REVIVE) {
      isListeningActive = false;
      currentOnError?.("Speech recognition is struggling on your device. You can try typing your response instead.");
    }
  };

  rec.onend = () => {
    if (isListeningActive && !isTTSPlaying) {
      console.log("[Mobile Speech] End detected but active - restarting...");
      setTimeout(() => {
        if (isListeningActive) startRecognitionInstance(true);
      }, 100);
    }
  };

  return rec;
}

function resetRecognition() {
  if (recognition) {
    try {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.stop();
    } catch (e) {}
    recognition = null;
  }
}

function startRecognitionInstance(forceRefresh = true) {
  if (isTTSPlaying) return; // Prevent mic starting during TTS
  
  if (forceRefresh || !recognition) {
    resetRecognition();
    recognition = initRecognition();
  }

  if (isStarting || !recognition) return;
  
  isStarting = true;
  
  if (startingGuardTimer) clearTimeout(startingGuardTimer);
  startingGuardTimer = setTimeout(() => {
    if (isStarting) {
      isStarting = false;
      startRecognitionInstance(true);
    }
  }, 2000);

  try {
    recognition.start();
    recognition.onstart = () => {
      isStarting = false;
      if (startingGuardTimer) clearTimeout(startingGuardTimer);
      console.log("[Mobile Speech] Mic active.");
    };
  } catch (e: any) {
    isStarting = false;
    if (e.name === 'InvalidStateError') {
      setTimeout(() => startRecognitionInstance(true), 100);
    }
  }
}

export async function startListening(
  onResult: SpeechCallback,
  onEnd: EndCallback,
  onError: ErrorCallback
): Promise<void> {
  if (!isSpeechRecognitionSupported()) {
    onError("Speech recognition not supported");
    return;
  }

  // Ensure state is clean
  isListeningActive = true;
  fullTranscript = "";
  autoReviveCount = 0;
  currentOnResult = onResult;
  currentOnEnd = onEnd;
  currentOnError = onError;

  await unlockMic(); // Re-unlock for safety
  startMobileTimeouts();
  startRecognitionInstance(true);
}

export function stopListening(): void {
  const finalTranscript = fullTranscript.trim();
  isListeningActive = false;
  isStarting = false;
  clearTimers();
  
  if (recognition) {
    try {
      recognition.abort();
    } catch (e) {}
  }

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
  // Mobile Safety: Stop recognition before speaking
  const wasListening = isListeningActive;
  if (wasListening) {
    console.log("[Mobile Speech] TTS Start - Silencing mic.");
    isListeningActive = false;
    if (recognition) try { recognition.abort(); } catch(e){}
  }

  isTTSPlaying = true;
  
  const wrappedOnEnd = () => {
    isTTSPlaying = false;
    onEnd?.();
    
    // Handoff Delay for stability
    const delay = device.handoffDelay;
    console.log(`[Mobile Speech] TTS End - Waiting ${delay}ms before handoff.`);
    
    setTimeout(() => {
      if (wasListening) {
        isListeningActive = true;
        startRecognitionInstance(true);
      }
    }, delay);
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

export { startListening as startListeningFinal };
export { startListening as startListeningStandard };
