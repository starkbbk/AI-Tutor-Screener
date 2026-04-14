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
      currentIndex++;
      speakNext();
    };

    window.speechSynthesis.speak(utterance);
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
