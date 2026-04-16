import { NextRequest, NextResponse } from 'next/server';

let lastSuccessfulKeyIndex = 0;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const availableKeys = [
      process.env.ELEVENLABS_API_KEY_1,
      process.env.ELEVENLABS_API_KEY_2,
      process.env.ELEVENLABS_API_KEY_3,
      process.env.ELEVENLABS_API_KEY_4,
      process.env.ELEVENLABS_API_KEY_5,
      process.env.ELEVENLABS_API_KEY_6,
    ].filter(Boolean) as string[];

    if (availableKeys.length === 0) {
      console.error("[TTS API] No ELEVENLABS_API_KEYS are set");
      return NextResponse.json({ error: 'API keys not configured' }, { status: 500 });
    }

    const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Bella (Universal)
    const modelId = "eleven_multilingual_v2";

    // Rotate through keys starting from the last successful one
    let startIndex = lastSuccessfulKeyIndex < availableKeys.length ? lastSuccessfulKeyIndex : 0;
    let lastError: any = null;

    for (let i = 0; i < availableKeys.length; i++) {
      const idx = (startIndex + i) % availableKeys.length;
      const apiKey = availableKeys[idx];

      try {
        console.log(`[TTS API] Trying ElevenLabs Key ${idx + 1}...`);
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (response.ok) {
          // Success! Update the sticky index
          lastSuccessfulKeyIndex = idx;
          const audioBuffer = await response.arrayBuffer();
          return new NextResponse(audioBuffer, {
            headers: { 'Content-Type': 'audio/mpeg' },
          });
        }

        // Handle specific failure codes for fallback
        const errorData = await response.json().catch(() => ({}));
        console.warn(`[TTS API] Key ${idx + 1} failed (Status: ${response.status}):`, errorData);
        
        // If it's a 429 (Rate Limit) or 401/403 (Invalid/Quota), continue to next key
        if (response.status === 429 || response.status === 401 || response.status === 403 || response.status === 402) {
          lastError = errorData;
          continue;
        }

        // For other errors, we might want to throw immediately, but safely we can try next key too
        lastError = errorData;
      } catch (err) {
        console.error(`[TTS API] Key ${idx + 1} fatal error:`, err);
        lastError = err;
        continue;
      }
    }

    // If we reach here, all keys failed
    console.error("[TTS API] ALL ELEVENLABS KEYS FAILED.");
    return NextResponse.json(
      { error: 'All TTS providers failed', detail: lastError },
      { status: 503 }
    );
  } catch (error: any) {
    console.error("[TTS API] Internal error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
