export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

type SpeechRecognitionEvent = any;

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

type SpeechCallback = (result: SpeechRecognitionResult) => void;
type ErrorCallback = (error: string) => void;
type EndCallback = (finalTranscript: string) => void;

let recognition: SpeechRecognition | null = null;
let silenceTimeout: NodeJS.Timeout | null = null;
let maxDurationTimeout: NodeJS.Timeout | null = null;

// Persistent state across auto-restarts
let accumulatedTranscript = "";
let isManualStop = false;
let isSilenceTimeoutReached = false;
let lastProgressTime = 0;

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.speechSynthesis;
}

export function unlockMic(): void {
  if (!isSpeechRecognitionSupported()) return;
  
  try {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const tempRecog = new SpeechRecognitionConstructor();
    tempRecog.onstart = () => {
      tempRecog.stop();
      console.log("Mic unlocked successfully");
    };
    tempRecog.onerror = () => {
      // Ignore errors during unlock
    };
    tempRecog.start();
  } catch (e) {
    console.warn("Failed to unlock mic:", e);
  }
}

export function startListening(
  onResult: SpeechCallback,
  onEnd: EndCallback,
  onError: ErrorCallback
): void {
  if (!isSpeechRecognitionSupported()) {
    onError('Speech recognition is not supported in this browser.');
    return;
  }

  // Reset state for a new manual session
  accumulatedTranscript = "";
  isManualStop = false;
  isSilenceTimeoutReached = false;
  lastProgressTime = Date.now();

  const SPEAKING_SILENCE_TIMEOUT = 5000;
  const IDLE_SILENCE_TIMEOUT = 12000; // 12 seconds if haven't started talking yet
  const MAX_RECORDING_TIME = 3600000; // 1 hour

  let watchdogTimer: NodeJS.Timeout | null = null;
  const WATCHDOG_TIMEOUT = 6000; // 6 seconds of absolute silence (no results) forces restart

  const initRecognition = () => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const newRecognition = new SpeechRecognitionConstructor();
    
    newRecognition.continuous = false; 
    newRecognition.interimResults = true;
    newRecognition.lang = 'en-US';

    newRecognition.onstart = () => {
      console.log("Speech recognition session started");
      resetSilenceTimeout();
      resetWatchdogTimer();
      
      if (!maxDurationTimeout) {
        maxDurationTimeout = setTimeout(() => {
          stopListening();
        }, MAX_RECORDING_TIME);
      }
    };

    const resetSilenceTimeout = () => {
      if (silenceTimeout) clearTimeout(silenceTimeout);
      
      // THE FIX: Switch between a short timeout (finished talking) 
      // and a long timeout (just thinking)
      const timeoutDuration = accumulatedTranscript.trim().length > 0 
        ? SPEAKING_SILENCE_TIMEOUT 
        : IDLE_SILENCE_TIMEOUT;

      silenceTimeout = setTimeout(() => {
        console.log("Silence timeout reached. Transcript empty:", !accumulatedTranscript.trim());
        isSilenceTimeoutReached = true;
        stopListening();
      }, timeoutDuration);
    };

    const resetWatchdogTimer = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        if (!isManualStop && !isSilenceTimeoutReached) {
          console.warn("Watchdog: Reconnecting mic...");
          newRecognition.stop(); 
        }
      }, WATCHDOG_TIMEOUT);
    };

    newRecognition.onsoundstart = () => {
       resetWatchdogTimer(); 
    };

    newRecognition.onresult = (event: SpeechRecognitionEvent) => {
      resetWatchdogTimer();
      lastProgressTime = Date.now();

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

      const fullFinal = (accumulatedTranscript + " " + currentFinalTranscript).trim();
      const fullInterim = (fullFinal + " " + interimTranscript).trim();

      if (currentFinalTranscript || interimTranscript) {
        // We received actual words, so we can now use the shorter 5s finished-talking timeout
        resetSilenceTimeout();
      }

      if (currentFinalTranscript) {
        accumulatedTranscript = fullFinal;
        onResult({ transcript: accumulatedTranscript, isFinal: true });
      } else if (interimTranscript) {
        onResult({ transcript: fullInterim, isFinal: false });
      }
    };

    newRecognition.onerror = (event: any) => {
      if (event.error === 'aborted') return;
      if (event.error === 'no-speech' && !isManualStop && !isSilenceTimeoutReached) return; 

      console.error('Speech Recognition Error:', event.error);
      if (isManualStop || isSilenceTimeoutReached) {
        const errorMap: Record<string, string> = {
          'audio-capture': 'No microphone found. Please check your audio settings.',
          'not-allowed': 'Microphone access denied. Please allow permissions.',
          'network': 'Network error! This often happens due to a slow connection.',
        };
        onError(errorMap[event.error] || `Mic Error (${event.error}). Please try again.`);
      }
    };

    newRecognition.onend = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      
      const hasContent = accumulatedTranscript.trim().length > 0;
      
      // IMPROVED RESTART LOGIC:
      // If it wasn't a manual stop AND (it wasn't a silence timeout OR we have no words yet)
      // we should keep the loop going.
      if (!isManualStop && (!isSilenceTimeoutReached || !hasContent)) {
        setTimeout(() => {
          if (!isManualStop && (!isSilenceTimeoutReached || !hasContent)) {
            // Reset silence timeout flag if we are auto-restarting due to empty silence
            if (!hasContent) isSilenceTimeoutReached = false;
            
            const instance = initRecognition();
            recognition = instance;
            try {
              instance.start();
            } catch (e) {
              console.error("Failed to start mic instance:", e);
              onEnd(accumulatedTranscript);
            }
          }
        }, 100);
      } else {
        clearTimeouts();
        onEnd(accumulatedTranscript);
      }
    };

    return newRecognition;
  };

  const instance = initRecognition();
  recognition = instance;
  instance.start();
}

export function stopListening(): void {
  isManualStop = true;
  clearTimeouts();
  if (recognition) {
    try {
      recognition.stop();
    } catch {
      // already stopped
    }
    recognition = null;
  }
}

function clearTimeouts(): void {
  if (silenceTimeout) {
    clearTimeout(silenceTimeout);
    silenceTimeout = null;
  }
  if (maxDurationTimeout) {
    clearTimeout(maxDurationTimeout);
    maxDurationTimeout = null;
  }
}

export const getPreferredVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  
  // Priority order — best natural female English voices
  const preferredVoices = [
    'Google UK English Female',
    'Google US English Female', 
    'Samantha',                    // macOS/iOS default female
    'Karen',                       // macOS Australian female
    'Moira',                       // macOS Irish female
    'Fiona',                       // macOS Scottish female
    'Victoria',                    // macOS female
    'Microsoft Zira',              // Windows female
    'Microsoft Jenny',             // Windows female (natural)
    'English Female',              // Generic fallback
  ];
  
  // Try to find the best voice in priority order
  for (const name of preferredVoices) {
    const voice = voices.find(v => 
      v.name.includes(name) || v.name === name
    );
    if (voice) return voice;
  }
  
  // Fallback: find ANY English female voice
  const englishFemaleVoice = voices.find(v => 
    v.lang.startsWith('en') && 
    (v.name.toLowerCase().includes('female') || 
     v.name.toLowerCase().includes('samantha') ||
     v.name.toLowerCase().includes('karen') ||
     v.name.toLowerCase().includes('zira'))
  );
  if (englishFemaleVoice) return englishFemaleVoice;
  
  // Last fallback: any English voice
  const anyEnglish = voices.find(v => v.lang.startsWith('en'));
  return anyEnglish || voices[0] || null;
};

export function preloadVoices(): void {
  if (!isSpeechSynthesisSupported()) return;
  const load = () => {
    const selected = getPreferredVoice();
    if (selected) console.log("Voice preloaded:", selected.name);
  };
  load();
  window.speechSynthesis.onvoiceschanged = load;
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

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Chrome bug fix: break long text into chunks
  const MAX_LENGTH = 200;
  // Match sentences or fall back to just splitting at characters if no punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let chunks: string[] = [];
  let currentChunk = '';
  
  sentences.forEach(sentence => {
    if ((currentChunk + sentence).length > MAX_LENGTH) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  });
  if (currentChunk) chunks.push(currentChunk.trim());
  
  // Sequential chunk processing
  let currentIndex = 0;
  let hasStarted = false;

  const speakNext = () => {
    if (currentIndex >= chunks.length) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[currentIndex]);
    const voice = getPreferredVoice();
    
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.lang = 'en-US';
    utterance.rate = 0.9;      // Calm and clear
    utterance.pitch = 1.05;    // Friendly female tone
    utterance.volume = 1.0;

    utterance.onstart = () => {
      if (!hasStarted) {
        onStart?.();
        hasStarted = true;
      }
    };

    utterance.onend = () => {
      currentIndex++;
      speakNext();
    };

    utterance.onerror = (e) => {
      console.error("Speech error:", e);
      // Ensure we don't get stuck if there's an error
      currentIndex++;
      if (currentIndex >= chunks.length) {
        onEnd?.();
      } else {
        speakNext();
      }
    };

    window.speechSynthesis.speak(utterance);
    
    // Safety fallback: If speech doesn't start or get blocked on mobile without gesture, 
    // we need to make sure we don't stay in a 'speaking' state forever.
    // Most browsers will trigger onerror immediately if blocked.
  };

  speakNext();
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

// Declare global types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
