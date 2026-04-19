/**
 * ElevenLabs Speech Utility
 * Provides natural-sounding TTS with a native fallback.
 */

let currentAudioSingleton: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

// Initialize the singleton as early as possible
if (typeof window !== 'undefined') {
    currentAudioSingleton = new Audio();
}

/**
 * Prime the audio system on a user gesture.
 * Required for iOS/Safari to allow subsequent automatic playbacks.
 */
export function unlockAudio(): void {
    if (!currentAudioSingleton) return;
    
    console.log("[ELEVENLABS] Unlocking audio singleton...");
    currentAudioSingleton.play().then(() => {
        currentAudioSingleton?.pause();
        console.log("[ELEVENLABS] Audio system UNLOCKED.");
    }).catch(() => {
        // This is expected if no user gesture has occurred yet
        console.log("[ELEVENLABS] Waiting for user gesture to unlock audio.");
    });
}

export async function speakWithElevenLabs(
  text: string,
  onStart?: (duration?: number) => void,
  onEnd?: () => void,
  nativeFallback?: (text: string, onStart?: (duration?: number) => void, onEnd?: () => void) => void
): Promise<void> {
  // 1. Stop and cleanup previous
  stopSpeakingElevenLabs();
  if (currentUrl) {
    try {
        URL.revokeObjectURL(currentUrl);
    } catch(e) {}
  }

  // 2. Fetch and prepare new audio
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error('TTS API failed');

    const audioBlob = await response.blob();
    currentUrl = URL.createObjectURL(audioBlob);
    
    if (!currentAudioSingleton) {
        currentAudioSingleton = new Audio();
    }

    const audio = currentAudioSingleton;
    audio.src = currentUrl;
    
    const handleStart = () => {
        const duration = audio.duration;
        if (isNaN(duration) || duration <= 0) {
          const words = text.split(/\s+/).length;
          onStart?.((words / 150) * 60);
        } else {
          onStart?.(duration);
        }
    };

    audio.onplay = handleStart;
    audio.onloadedmetadata = handleStart;
    
    audio.onended = () => {
      onEnd?.();
      currentUrl = null;
    };
    
    audio.onerror = () => {
      console.error("[ELEVENLABS] Audio playback error, falling back...");
      nativeFallback?.(text, onStart, onEnd);
    };

    // 3. Play via the already-unlocked singleton
    await audio.play();
  } catch (error) {
    console.error("[ELEVENLABS] Integration error, falling back to native TTS:", error);
    if (nativeFallback) {
      nativeFallback(text, onStart, onEnd);
    } else {
      onEnd?.();
    }
  }
}

export function stopSpeakingElevenLabs(): void {
  if (currentAudioSingleton) {
    currentAudioSingleton.pause();
    currentAudioSingleton.currentTime = 0;
    // Don't nullify the singleton, just pause it
  }
}
