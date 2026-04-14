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

  const SILENCE_TIMEOUT = 5000;
  const MAX_RECORDING_TIME = 120000;

  const initRecognition = () => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const newRecognition = new SpeechRecognitionConstructor();
    
    // Critical for mobile: sometimes 'true' causes issues on some browsers, 
    // but the user explicitly requested it for mobile Chrome/Safari.
    newRecognition.continuous = true; 
    newRecognition.interimResults = true;
    newRecognition.lang = 'en-IN';

    newRecognition.onstart = () => {
      console.log("Speech recognition session started");
      resetSilenceTimeout();
      
      if (!maxDurationTimeout) {
        maxDurationTimeout = setTimeout(() => {
          stopListening();
        }, MAX_RECORDING_TIME);
      }
    };

    const resetSilenceTimeout = () => {
      if (silenceTimeout) clearTimeout(silenceTimeout);
      silenceTimeout = setTimeout(() => {
        console.log("Silence timeout reached");
        isSilenceTimeoutReached = true;
        stopListening();
      }, SILENCE_TIMEOUT);
    };

    newRecognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimeout();
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

      // Join accumulated with current
      // We need to be careful not to duplicate if we are restarting
      const fullFinal = (accumulatedTranscript + " " + currentFinalTranscript).trim();
      const fullInterim = (fullFinal + " " + interimTranscript).trim();

      if (currentFinalTranscript) {
        // Only update the actual accumulated transcript when we get final results
        // Use a space to join if there's already content
        accumulatedTranscript = (accumulatedTranscript + " " + currentFinalTranscript).trim();
        onResult({ transcript: accumulatedTranscript, isFinal: true });
      } else if (interimTranscript) {
        onResult({ transcript: fullInterim, isFinal: false });
      }
    };

    newRecognition.onerror = (event: any) => {
      if (event.error === 'aborted') {
        console.log('Speech Recognition aborted cleanly.');
        return;
      }

      // If it's a transient error on mobile, we might want to restart instead of failing
      if (event.error === 'no-speech' && !isManualStop && !isSilenceTimeoutReached) {
        console.log('No speech detected, but not stopping yet...');
        return;
      }

      const errorMap: Record<string, string> = {
        'no-speech': "I didn't catch that. Could you try again?",
        'audio-capture': 'No microphone found. Please check your audio settings.',
        'not-allowed': 'Microphone access denied. Please allow permissions.',
        'network': 'Network error! This often happens due to a slow connection.',
      };
      
      console.error('Speech Recognition Error:', event.error);
      
      // Only fire error if we're not planning to auto-restart
      if (isManualStop || isSilenceTimeoutReached) {
        onError(errorMap[event.error] || `Mic Error (${event.error}). Please try again.`);
      }
    };

    newRecognition.onend = () => {
      console.log("Speech recognition session ended. Manual stop:", isManualStop, "Silence:", isSilenceTimeoutReached);
      
      // THE FIX FOR MOBILE: Auto-restart if it wasn't a manual stop and not a silence timeout
      if (!isManualStop && !isSilenceTimeoutReached) {
        console.log("Unexpected end on mobile. Restarting...");
        try {
          // Brief delay to allow the browser to clean up the previous session
          setTimeout(() => {
            if (!isManualStop && !isSilenceTimeoutReached) {
              const instance = initRecognition();
              recognition = instance;
              instance.start();
            }
          }, 100);
        } catch (e) {
          console.error("Failed to restart recognition:", e);
          onEnd(accumulatedTranscript);
        }
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
