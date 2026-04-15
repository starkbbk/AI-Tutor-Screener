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
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

type SpeechCallback = (result: SpeechRecognitionResult) => void;
type ErrorCallback = (error: string) => void;
type EndCallback = (finalTranscript: string, audioBlob?: Blob | null) => void;
type VolumeCallback = (volume: number) => void;

let recognition: SpeechRecognition | null = null;
let silenceTimeout: NodeJS.Timeout | null = null;
let maxDurationTimeout: NodeJS.Timeout | null = null;

// Persistent state across auto-restarts
let accumulatedTranscript = "";
let isManualStop = false;
let isSilenceTimeoutReached = false;
let lastProgressTime = 0;

// MediaRecorder state
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

// Speech Synthesis Lock - Prevents phantom voices after stop
let activeSpeechId = 0;

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
  onError: ErrorCallback,
  onVolume?: VolumeCallback
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
  const WATCHDOG_TIMEOUT = 6000; 

  // HARDWARE HEARTBEAT: Monitor actual volume levels via Web Audio API
  let audioContext: AudioContext | null = null;
  let audioStream: MediaStream | null = null;
  let volumeWatchdog: NodeJS.Timeout | null = null;

  const stopHardwareMonitor = () => {
    if (volumeWatchdog) clearInterval(volumeWatchdog);
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      audioStream = null;
    }
  };

  const startHardwareMonitor = async () => {
    try {
      if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') await audioContext.resume();

      if (!audioStream) {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      // Initialize MediaRecorder if not already running
      if (!mediaRecorder && audioStream) {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/mp4'; 
        
        mediaRecorder = new MediaRecorder(audioStream, { mimeType });
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        mediaRecorder.start(1000); // 1-second chunks
        console.log("MediaRecorder started for Whisper fallback");
      }

      const source = audioContext.createMediaStreamSource(audioStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silentCheckCount = 0;
      if (volumeWatchdog) clearInterval(volumeWatchdog);
      
      volumeWatchdog = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;

        // Pulse the volume to the UI
        if (onVolume) onVolume(average);

        if (average < 1) { // Threshold for "absolute silence/stall"
          silentCheckCount++;
        } else {
          silentCheckCount = 0;
        }

        // If hardware has been reporting zero volume for 5 seconds while we are in Listening mode
        if (silentCheckCount > 50 && !isManualStop && !isSilenceTimeoutReached && recognition) {
          console.warn("Hardware Heartbeat: Flatline detected for 5s. Hard Reseting...");
          silentCheckCount = 0;
          try {
             // Abort is faster than stop for hard resets
             recognition.abort(); 
          } catch (e) {
             // Already stopped
          }
        }
      }, 100); // Check every 100ms
    } catch (e) {
      console.warn("Failed to start hardware heartbeat monitor:", e);
    }
  };

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
      
      // Attempt to start hardware monitor (MediaRecorder + Volume)
      // We do this inside a microtask to avoid blocking the main thread
      setTimeout(() => {
        startHardwareMonitor().catch(e => {
          console.warn("Hardware monitor failed (likely Safari mic conflict):", e);
          // If native recognition is already running, we might still be okay
        });
      }, 0);
      
      if (!maxDurationTimeout) {
        maxDurationTimeout = setTimeout(() => {
          stopListening();
        }, MAX_RECORDING_TIME);
      }
    };

    const resetSilenceTimeout = () => {
      if (silenceTimeout) clearTimeout(silenceTimeout);
      
      const timeoutDuration = accumulatedTranscript.trim().length > 0 
        ? SPEAKING_SILENCE_TIMEOUT 
        : IDLE_SILENCE_TIMEOUT;

      silenceTimeout = setTimeout(() => {
        isSilenceTimeoutReached = true;
        stopListening();
      }, timeoutDuration);
    };

    const resetWatchdogTimer = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        if (!isManualStop && !isSilenceTimeoutReached) {
          console.warn("Recognition Watchdog: Reconnecting mic...");
          try {
            newRecognition.abort(); 
          } catch (e) {}
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
      
      if (!isManualStop && (!isSilenceTimeoutReached || !hasContent)) {
        // We aren't done yet, just a silent pause or auto-restart
        setTimeout(() => {
          if (!isManualStop && (!isSilenceTimeoutReached || !hasContent)) {
            if (!hasContent) isSilenceTimeoutReached = false;
            
            const instance = initRecognition();
            recognition = instance;
            try {
              instance.start();
            } catch (e) {
              console.error("Failed to start mic instance:", e);
              completeSession();
            }
          }
        }, 100);
      } else {
        completeSession();
      }
    };

    const completeSession = () => {
      clearTimeouts();
      stopHardwareMonitor();
      
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: mediaRecorder?.mimeType });
          mediaRecorder = null;
          audioChunks = [];
          onEnd(accumulatedTranscript, audioBlob);
        };
        mediaRecorder.stop();
      } else {
        onEnd(accumulatedTranscript, null);
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
  const currentSpeechId = ++activeSpeechId; // Increment ID for this speech session

  const speakNext = () => {
    // ABORT if this session is no longer active
    if (currentSpeechId !== activeSpeechId) {
      console.log("[SPEECH] Aborting session", currentSpeechId);
      return;
    }

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
    utterance.rate = 0.9;      
    utterance.pitch = 1.05;    
    utterance.volume = 1.0;

    utterance.onstart = () => {
      if (!hasStarted) {
        onStart?.();
        hasStarted = true;
      }
    };

    utterance.onend = () => {
      if (currentSpeechId !== activeSpeechId) return; // Guard against late events
      currentIndex++;
      speakNext();
    };

    utterance.onerror = (e: any) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.error("Speech error:", e);
      
      if (currentSpeechId === activeSpeechId) {
        currentIndex++;
        if (currentIndex >= chunks.length) {
          onEnd?.();
        } else {
          speakNext();
        }
      }
    };

    // Chrome Fix: Ensure the synthesis engine is not paused/stalled
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  };

  speakNext();
}

export function stopSpeaking(): void {
  activeSpeechId++; // Invalidate current session
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
