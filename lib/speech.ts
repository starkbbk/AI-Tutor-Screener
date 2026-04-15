/**
 * Speech Engine v2 (Whisper-Only)
 * 
 * Replaces unreliable Web Speech API with MediaRecorder + Groq Whisper.
 * Provides high-accuracy transcription and volume-based silence detection.
 */

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

type VolumeCallback = (volume: number) => void;
type EndCallback = (finalTranscript: string, audioBlob?: Blob | null) => void;
type ErrorCallback = (error: string) => void;

// Module-level state
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let audioContext: AudioContext | null = null;
let audioStream: MediaStream | null = null;
let analyser: AnalyserNode | null = null;
let volumeWatchdog: NodeJS.Timeout | null = null;
let activeSpeechId = 0; // For synthesis lock

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.speechSynthesis;
}

let currentEndCallback: EndCallback | null = null;

/**
 * Stop recording and return result.
 */
export function stopListening(): void {
  if (volumeWatchdog) {
    clearInterval(volumeWatchdog);
    volumeWatchdog = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder?.mimeType });
      
      if (audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
        audioStream = null;
      }

      if (currentEndCallback) {
        currentEndCallback("", audioBlob);
        currentEndCallback = null;
      }
      
      mediaRecorder = null;
      audioChunks = [];
    };
    mediaRecorder.stop();
  }
}

export async function startListening(
  onResult: (res: { transcript: string; isFinal: boolean }) => void, 
  onEnd: EndCallback,
  onError: ErrorCallback,
  onVolume?: VolumeCallback
): Promise<void> {
  currentEndCallback = onEnd;

  try {
    // 1. Request Microphone
    if (!audioStream) {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    // 2. Initialize Audio Analyser for volume/silence detection
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') await audioContext.resume();

    const source = audioContext.createMediaStreamSource(audioStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // 3. Initialize MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : 'audio/mp4'; // iOS fallback
    
    mediaRecorder = new MediaRecorder(audioStream, { mimeType });
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.start(1000); // 1-second chunks for safety

    // 4. Silence Detection Engine
    let silentStartTime: number | null = null;
    let totalRecordingTime = 0;
    const SILENCE_THRESHOLD = 2; 
    const SILENCE_DURATION_LIMIT = 5000; 
    const MIN_RECORDING_DURATION = 3000; 
    const MAX_RECORDING_DURATION = 120000; 

    if (volumeWatchdog) clearInterval(volumeWatchdog);

    volumeWatchdog = setInterval(() => {
      if (!analyser) return;

      analyser.getByteFrequencyData(dataArray);
      const averageVolume = dataArray.reduce((a, b) => a + b) / bufferLength;

      // Pulse volume to UI
      if (onVolume) onVolume(averageVolume);

      totalRecordingTime += 100;

      // Silence detection logic
      if (averageVolume < SILENCE_THRESHOLD) {
        if (!silentStartTime) silentStartTime = Date.now();
        
        const currentSilenceDuration = Date.now() - silentStartTime;

        // Condition for auto-stop: 5s silence AND at least 3s total recording
        if (currentSilenceDuration > SILENCE_DURATION_LIMIT && totalRecordingTime > MIN_RECORDING_DURATION) {
          console.log("[SPEECH] Silence limit reached. Stopping...");
          stopListening();
        }
      } else {
        // Voice detected, reset silence timer
        silentStartTime = null;
      }

      // Safety limit: 2 minutes
      if (totalRecordingTime >= MAX_RECORDING_DURATION) {
        console.warn("[SPEECH] Max duration reached. Stopping...");
        stopListening();
      }
    }, 100);

    console.log("[SPEECH] Whisper Recording Started...");

  } catch (err: any) {
    console.error("[SPEECH] Failed to start recording:", err);
    if (err.name === 'NotAllowedError') {
      onError("Microphone access denied. Please allow permissions in your browser.");
    } else {
      onError("Failed to access microphone. Please check your settings.");
    }
  }
}

// --- SPEECH SYNTHESIS (Output) ---

export const getPreferredVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = ['Google UK English Female', 'Google US English Female', 'Samantha', 'Microsoft Jenny'];
  for (const name of preferred) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) return voice;
  }
  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
};

export function preloadVoices(): void {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
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
  
  const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
  let currentIndex = 0;
  let hasStarted = false;
  const currentSpeechId = ++activeSpeechId;

  const speakNext = () => {
    if (currentSpeechId !== activeSpeechId) return;
    if (currentIndex >= chunks.length) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[currentIndex].trim());
    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      if (!hasStarted) { onStart?.(); hasStarted = true; }
    };
    utterance.onend = () => {
      if (currentSpeechId !== activeSpeechId) return;
      currentIndex++;
      speakNext();
    };
    utterance.onerror = (e) => {
      console.error("[SPEECH SYNTHESIS] Error:", e);
      currentIndex++;
      speakNext();
    };

    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  };

  speakNext();
}

export function stopSpeaking(): void {
  activeSpeechId++;
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

// Export for InterviewRoom
export function unlockMic(): void {
  // Logic to 'prime' the audio context if needed
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
}
