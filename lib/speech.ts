/**
 * Robust Native Speech Recognition Engine
 * 
 * Features:
 * 1. Continuous Listening across phrase boundaries.
 * 2. Auto-Restart watchdog to handle unexpected browser stops.
 * 3. Accumulated transcript across multiple recognition sessions.
 * 4. Custom silence detection for intelligent auto-submission.
 * 5. Robust error handling and double-start prevention.
 */

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

type SpeechCallback = (result: SpeechRecognitionResult) => void;
type EndCallback = (finalTranscript: string) => void;
type ErrorCallback = (error: string) => void;

// Module-level state persistent across sessions and restarts
let recognition: any = null;
let isListeningActive = false;
let noSpeechTimer: NodeJS.Timeout | null = null;
let startingGuardTimer: NodeJS.Timeout | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

import { speakWithElevenLabs, stopSpeakingElevenLabs } from "./elevenlabs-speech";

let currentOnResult: SpeechCallback | null = null;
let currentOnEnd: EndCallback | null = null;
let currentOnError: ErrorCallback | null = null;
let isStarting = false;
let fullTranscript = ""; 

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.speechSynthesis;
}

/**
 * Cleanup timers
 */
function clearTimers() {
  if (noSpeechTimer) {
    clearTimeout(noSpeechTimer);
    noSpeechTimer = null;
  }
}


/**
 * Handle total lack of speech
 */
function handleNoSpeechTimeout() {
  if (!fullTranscript.trim()) {
    console.log("[SPEECH] No speech detected for 15s.");
    if (currentOnResult) {
      currentOnResult({ transcript: "I did not hear anything. Please speak your answer.", isFinal: false });
    }
    resetTimers();
  }
}

/**
 * Reset timers on every piece of speech
 */
function resetTimers() {
  clearTimers();
  if (!isListeningActive) return;

  // 15s timer for when they haven't said ANYTHING
  // (Optional: can also be handled by the UI timer)
  // noSpeechTimer = setTimeout(handleNoSpeechTimeout, 15000);
}

/**
 * Initialize recognition object
 */
function initRecognition() {
  const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec = new SpeechRecognitionConstructor();
  
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';

  rec.onresult = (event: any) => {
    // Note: We no longer handle auto-submission timers here.
    // InterviewRoom handles the silence countdown based on the results we send.
    
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
    }

    const displayTranscript = (fullTranscript + " " + interimTranscript).trim();
    if (currentOnResult) {
      currentOnResult({ transcript: displayTranscript, isFinal: false });
    }
  };

  rec.onerror = (event: any) => {
    console.warn("[SPEECH] Recognition error:", event.error);
    
    const errorMap: Record<string, string> = {
      'audio-capture': "Microphone not available. Please check your mic.",
      'not-allowed': "Microphone permission denied. Please allow microphone access.",
    };

    if (errorMap[event.error]) {
      isListeningActive = false;
      if (currentOnError) currentOnError(errorMap[event.error]);
    } else {
      // For no-speech, network, etc. - restart silently in onend
      console.log("[SPEECH] Persistent error or silence, will auto-restart if active.");
    }
  };

  rec.onend = () => {
    console.log("[MIC_ENGINE] Session ended. Active?", isListeningActive);
    if (isListeningActive) {
      console.log("[MIC_ENGINE] Persistent session - Auto-restarting with 500ms delay...");
      setTimeout(() => {
         if (isListeningActive) startRecognitionInstance();
      }, 500); 
    }
  };

  return rec;
}

/**
 * Cleanup and completely reset recognition
 */
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

/**
 * Safe start/restart logic
 */
function startRecognitionInstance() {
  if (!recognition) recognition = initRecognition();
  if (isStarting) {
    console.log("[SPEECH] startRecognitionInstance: isStarting is locked.");
    return;
  }
  
  isStarting = true;
  
  // WATCHDOG: Reset isStarting if onstart doesn't fire within 1.5 seconds
  if (startingGuardTimer) clearTimeout(startingGuardTimer);
  startingGuardTimer = setTimeout(() => {
    if (isStarting) {
      console.log("[MIC_ENGINE] Watchdog: Resetting stuck isStarting guard (1.5s timeout).");
      isStarting = false;
    }
  }, 1500);

  try {
    recognition.start();
    recognition.onstart = () => { 
      console.log("[MIC_ENGINE] ON_START: Recognition is now active.");
      isStarting = false; 
      if (startingGuardTimer) clearTimeout(startingGuardTimer);
    };
  } catch (e: any) {
    console.warn("[SPEECH] Start conflict:", e.message);
    isStarting = false;
    if (startingGuardTimer) clearTimeout(startingGuardTimer);
  }
}

/**
 * Public function to start listening
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

  // Reset module state
  isListeningActive = true;
  fullTranscript = "";
  currentOnResult = onResult;
  currentOnEnd = onEnd;
  currentOnError = onError;

  resetTimers();
  startRecognitionInstance();
}

/**
 * Public function to stop listening
 */
export function stopListening(): void {
  console.log("[MIC_ENGINE] REQUEST_STOP: isListeningActive -> false");
  isListeningActive = false;
  isStarting = false;
  clearTimers();
  
  if (recognition) {
    try {
      console.log("[MIC_ENGINE] Aborting recognition session...");
      recognition.abort(); // Use abort for immediate reset on mobile
    } catch (e) {
      // already stopped  
    }
  }
}

// Re-export correct name for compatibility if needed
export { startListening as startListeningFinal };
export { startListening as startListeningStandard };

// --- SPEECH SYNTHESIS ---

export const getPreferredVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  
  const preferredVoices = [
    'Google UK English Female',
    'Google US English Female', 
    'Samantha',
    'Microsoft Jenny',
    'en-US-Female',
  ];
  
  for (const name of preferredVoices) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) return voice;
  }
  
  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
};

export function preloadVoices(): void {
  if (typeof window !== 'undefined') {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
}

export function speak(
  text: string,
  onStart?: (duration?: number) => void,
  onEnd?: () => void
): void {
  // Use ElevenLabs with native fallback
  speakWithElevenLabs(text, onStart, onEnd, speakNative);
}

/**
 * Native Speech Synthesis Fallback
 */
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
  
  // CRITICAL: Global reference to prevent garbage collection on Safari/Chrome
  currentUtterance = new SpeechSynthesisUtterance(text);
  const voice = getPreferredVoice();
  if (voice) currentUtterance.voice = voice;
  
  currentUtterance.lang = 'en-US';
  currentUtterance.rate = 1.0;
  
  currentUtterance.onstart = () => {
    // Estimate duration for native fallback: ~150 words per minute
    const words = text.split(/\s+/).length;
    const estimatedDuration = (words / 150) * 60;
    onStart?.(estimatedDuration || 2);
  };
  currentUtterance.onend = () => {
    onEnd?.();
    currentUtterance = null;
  };
  currentUtterance.onerror = (e) => {
    if (e.error === 'interrupted' || e.error === 'canceled') {
      console.log("[SPEECH] Synthesis interrupted (benign)");
    } else {
      console.error("Speech Synthesis Error:", e);
    }
    onEnd?.();
    currentUtterance = null;
  };

  try {
     window.speechSynthesis.speak(currentUtterance);
  } catch (err) {
    console.error("[SPEECH] Synthesis fatal error:", err);
    onEnd?.();
  }
}

export function stopSpeaking(): void {
  // Stop both ElevenLabs and Native
  stopSpeakingElevenLabs();
  if (typeof window !== 'undefined') {
    window.speechSynthesis.cancel();
  }
}

export function unlockMic(): void {
  // Keeping as placeholder for compatibility
}

// Add global types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
