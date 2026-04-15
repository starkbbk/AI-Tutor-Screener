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
let fullTranscript = "";
let silenceTimer: NodeJS.Timeout | null = null;
let noSpeechTimer: NodeJS.Timeout | null = null;

// Callbacks captured on start
let currentOnResult: SpeechCallback | null = null;
let currentOnEnd: EndCallback | null = null;
let currentOnError: ErrorCallback | null = null;

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
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  if (noSpeechTimer) {
    clearTimeout(noSpeechTimer);
    noSpeechTimer = null;
  }
}

/**
 * Handle success/submission after silence
 */
function handleSilenceTimeout() {
  const final = fullTranscript.trim();
  
  if (final.length >= 10) {
    console.log("[SPEECH] Silence detected, submitting answer:", final);
    stopListening();
    if (currentOnEnd) currentOnEnd(final);
  } else {
    console.log("[SPEECH] Silence detected but text too short. Prompting for more...");
    if (currentOnResult) {
      currentOnResult({ transcript: "Could you say a bit more?", isFinal: false });
    }
    // Reset timers to keep listening
    resetTimers();
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
  noSpeechTimer = setTimeout(handleNoSpeechTimeout, 15000);

  // 5s timer for when they've finished speaking
  silenceTimer = setTimeout(handleSilenceTimeout, 5000);
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
    resetTimers();
    
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
    console.log("[SPEECH] Session ended. Active?", isListeningActive);
    if (isListeningActive) {
      console.log("[SPEECH] Auto-restarting...");
      startRecognitionInstance();
    }
  };

  return rec;
}

/**
 * Safe start/restart logic
 */
function startRecognitionInstance() {
  if (!recognition) recognition = initRecognition();
  
  try {
    recognition.start();
  } catch (e) {
    console.warn("[SPEECH] Double start prevention triggered. Stopping then restarting...");
    try {
      recognition.stop();
    } catch {}
    
    setTimeout(() => {
      if (isListeningActive) {
        try { recognition.start(); } catch (e2) { console.error("[SPEECH] Fatal restart error:", e2); }
      }
    }, 100);
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
  console.log("[SPEECH] stopListening called.");
  isListeningActive = false;
  clearTimers();
  
  if (recognition) {
    try {
      recognition.stop();
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
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (!isSpeechSynthesisSupported()) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();

  // Handle Chrome silence bug and chunking if needed, but keeping it simple for now
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getPreferredVoice();
  if (voice) utterance.voice = voice;
  
  utterance.lang = 'en-US';
  utterance.rate = 1.0;
  
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = (e) => {
    console.error("Speech Synthesis Error:", e);
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
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
