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

let recognition: SpeechRecognition | null = null;
let silenceTimeout: NodeJS.Timeout | null = null;
let maxDurationTimeout: NodeJS.Timeout | null = null;

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
  onEnd: () => void,
  onError: ErrorCallback
): void {
  if (!isSpeechRecognitionSupported()) {
    onError('Speech recognition is not supported in this browser.');
    return;
  }

  const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const newRecognition = new SpeechRecognitionConstructor();
  newRecognition.continuous = true;
  newRecognition.interimResults = true;
  newRecognition.lang = 'en-IN';

  let lastSpeechTime = Date.now();
  let hasReceivedSpeech = false;

  newRecognition.onresult = (event: SpeechRecognitionEvent) => {
    hasReceivedSpeech = true;
    lastSpeechTime = Date.now();

    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    if (finalTranscript) {
      onResult({ transcript: finalTranscript, isFinal: true });
    } else if (interimTranscript) {
      onResult({ transcript: interimTranscript, isFinal: false });
    }
  };

  newRecognition.onerror = (event: any) => {
    // Softly ignore 'aborted' errors as they are often benign 
    // (e.g., stopping programmatically, navigating away, fast tapping)
    if (event.error === 'aborted') {
      console.log('Speech Recognition aborted cleanly.');
      return;
    }

    const errorMap: Record<string, string> = {
      'no-speech': "I didn't catch that. Could you try again?",
      'audio-capture': 'No microphone found. Please check your audio settings.',
      'not-allowed': 'Microphone access denied. Please allow permissions.',
      'network': 'Network error! This often happens due to a slow connection.',
    };
    
    // Log for debugging
    console.error('Speech Recognition Error:', event.error);
    
    onError(errorMap[event.error] || `Mic Error (${event.error}). Please try again.`);
  };


  newRecognition.onend = () => {
    clearTimeouts();
    onEnd();
  };

  recognition = newRecognition;
  newRecognition.start();

  // Auto-stop after 3 seconds of silence
  silenceTimeout = setInterval(() => {
    if (hasReceivedSpeech && Date.now() - lastSpeechTime > 3000) {
      stopListening();
    }
  }, 500);

  // Max duration: 120 seconds
  maxDurationTimeout = setTimeout(() => {
    stopListening();
  }, 120000);
}

export function stopListening(): void {
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
    clearInterval(silenceTimeout);
    silenceTimeout = null;
  }
  if (maxDurationTimeout) {
    clearTimeout(maxDurationTimeout);
    maxDurationTimeout = null;
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

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  // Try to pick a natural English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v =>
    v.name.includes('Google') && v.lang.startsWith('en')
  ) || voices.find(v =>
    v.lang.startsWith('en') && v.name.includes('Female')
  ) || voices.find(v =>
    v.lang.startsWith('en')
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
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
