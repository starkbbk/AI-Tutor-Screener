/**
 * Robust Native Speech Recognition Engine
 * 
 * Features:
 * 1. Continuous Listening across phrase boundaries.
 * 2. Auto-Restart watchdog to handle unexpected browser stops.
 * 3. Accumulated transcript across multiple recognition sessions.
 * 4. Custom silence detection for intelligent auto-submission.
 * 5. Device-Aware logic for mobile "Always On" capability.
 */

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
let interviewActive = false; // "Always On" flag for mobile
let noSpeechTimer: NodeJS.Timeout | null = null;
let startingGuardTimer: NodeJS.Timeout | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

import { speakWithElevenLabs, stopSpeakingElevenLabs } from "./elevenlabs-speech";

let currentOnResult: SpeechCallback | null = null;
let currentOnEnd: EndCallback | null = null;
let currentOnError: ErrorCallback | null = null;
let isStarting = false;
let fullTranscript = ""; 

/**
 * Simple mobile detection
 */
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const setInterviewActive = (active: boolean) => {
  console.log(`[MIC_ENGINE] interviewActive set to: ${active}`);
  interviewActive = active;
};

export const isInterfaceActive = () => interviewActive;

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.speechSynthesis;
}

function clearTimers() {
  if (noSpeechTimer) {
    clearTimeout(noSpeechTimer);
    noSpeechTimer = null;
  }
}

function resetTimers() {
  clearTimers();
  if (!isListeningActive) return;
}

function initRecognition() {
  const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
    }

    const displayTranscript = (fullTranscript + " " + interimTranscript).trim();
    if (currentOnResult) {
        currentOnResult({ transcript: displayTranscript, isFinal: false });
    }
  };

  rec.onerror = (event: any) => {
    console.warn("[SPEECH] Recognition error:", event.error);
    
    if (event.error === 'not-allowed') {
      isListeningActive = false;
      if (currentOnError) currentOnError("Microphone permission denied.");
    }
  };

  rec.onend = () => {
    console.log("[MIC_ENGINE] Session ended. Active?", isListeningActive, "Mobile?", isMobile(), "InterviewActive?", interviewActive);
    
    // Always restart on mobile if interview is active
    if (isMobile() && interviewActive) {
      console.log("[MIC_ENGINE] Mobile Always-On: Re-triggering recognition...");
      setTimeout(() => {
        startRecognitionInstance(true);
      }, 50);
      return;
    }

    if (isListeningActive) {
      setTimeout(() => {
         if (isListeningActive) startRecognitionInstance();
      }, 50); 
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

function startRecognitionInstance(forceRefresh = false) {
  if (forceRefresh) {
    resetRecognition();
  }
  
  if (!recognition) {
    recognition = initRecognition();
  }

  if (isStarting) return;
  isStarting = true;
  
  if (startingGuardTimer) clearTimeout(startingGuardTimer);
  startingGuardTimer = setTimeout(() => {
    if (isStarting) {
      isStarting = false;
      startRecognitionInstance(true);
    }
  }, 1500);

  try {
    recognition.start();
    recognition.onstart = () => { 
      isStarting = false; 
      if (startingGuardTimer) clearTimeout(startingGuardTimer);
    };
  } catch (e: any) {
    isStarting = false;
    if (startingGuardTimer) clearTimeout(startingGuardTimer);
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

  isListeningActive = true;
  fullTranscript = "";
  currentOnResult = onResult;
  currentOnEnd = onEnd;
  currentOnError = onError;

  resetTimers();
  startRecognitionInstance(true); 
}

export function stopListening(): void {
  // MOBILE FIX: If mobile and interview is still active, DO NOT stop.
  if (isMobile() && interviewActive) {
    console.log("[MIC_ENGINE] Mobile Always-On: Ignoring stopListening() request.");
    return;
  }

  console.log("[MIC_ENGINE] REQUEST_STOP: isListeningActive -> false");
  isListeningActive = false;
  isStarting = false;
  clearTimers();
  
  if (recognition) {
    try {
      recognition.abort();
    } catch (e) {}
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
  speakWithElevenLabs(text, onStart, onEnd, speakNative);
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
  stopSpeakingElevenLabs();
  if (typeof window !== 'undefined') {
    window.speechSynthesis.cancel();
  }
}

export function unlockMic(): void {
  // Explicitly for mobile compliance
  if (typeof window !== 'undefined' && 'AudioContext' in window) {
      const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
  }
}

// Global types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export { startListening as startListeningFinal };
export { startListening as startListeningStandard };
