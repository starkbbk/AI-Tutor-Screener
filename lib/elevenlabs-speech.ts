/**
 * ElevenLabs Speech Utility
 * Provides natural-sounding TTS with a native fallback.
 */

let currentAudio: HTMLAudioElement | null = null;

export async function speakWithElevenLabs(
  text: string,
  onStart?: (duration?: number) => void,
  onEnd?: () => void,
  nativeFallback?: (text: string, onStart?: (duration?: number) => void, onEnd?: () => void) => void
): Promise<void> {
  // Stop any currently playing audio
  stopSpeakingElevenLabs();

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('TTS API failed');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    currentAudio = new Audio(audioUrl);
    
    currentAudio.onplay = () => {
      // Provide duration when play starts
      onStart?.(currentAudio?.duration || 0);
    };
    
    currentAudio.onended = () => {
      onEnd?.();
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
    };
    
    currentAudio.onerror = () => {
      console.error("[ELEVENLABS] Audio playback error, falling back...");
      nativeFallback?.(text, onStart, onEnd);
    };

    // Pre-load metadata if possible or just wait for play
    await currentAudio.play();
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
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}
