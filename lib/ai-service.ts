/**
 * AI Service Handler
 * Implements a multi-layered fallback system using 4 Groq keys.
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIServiceOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

// Global state to track last successful key (Sticky Key logic)
let lastSuccessfulKeyIndex = 0; 

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
].filter(Boolean) as string[];

const GROQ_MODEL = "llama-3.3-70b-versatile";

const FRIENDLY_ERROR_MESSAGES = [
  "Just a moment, let me think about that...",
  "Taking a brief pause, one second please...",
  "Thinking deeply... back with you in a second.",
  "Just gathering my thoughts, please hold on...",
];

export async function generateAIResponse(messages: Message[], options: AIServiceOptions = {}) {
  // Reorder providers to start from the last successful Groq key index
  let startIndex = lastSuccessfulKeyIndex < GROQ_KEYS.length ? lastSuccessfulKeyIndex : 0;
  
  const executionOrder = [];
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const idx = (startIndex + i) % GROQ_KEYS.length;
    executionOrder.push({ key: GROQ_KEYS[idx], index: idx });
  }

  let lastError: any = null;

  for (const provider of executionOrder) {
    try {
      console.log(`[AI SERVICE] Trying Groq Key ${provider.index + 1}...`);
      const result = await callGroq(provider.key, messages, options);
      
      // Success! Update the sticky index
      lastSuccessfulKeyIndex = provider.index;
      return result;
    } catch (error: any) {
      lastError = error;
      const status = error.status || "Unknown";
      console.warn(`[AI SERVICE] Groq Key ${provider.index + 1} failed (Status: ${status}): ${error.message}`);
      continue;
    }
  }

  // If we reach here, everything failed
  console.error("[AI SERVICE] ALL GROQ KEYS FAILED.", lastError);
  throw new Error(getRandomFriendlyError());
}

export async function transcribeAudio(audioBlob: Blob) {
  let startIndex = lastSuccessfulKeyIndex < GROQ_KEYS.length ? lastSuccessfulKeyIndex : 0;
  
  const executionOrder = [];
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const idx = (startIndex + i) % GROQ_KEYS.length;
    executionOrder.push({ key: GROQ_KEYS[idx], index: idx });
  }

  let lastError: any = null;

  for (const provider of executionOrder) {
    try {
      console.log(`[WHISPER SERVICE] Trying Groq Key ${provider.index + 1}...`);
      
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("response_format", "json");

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.key}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Groq Whisper Error ${response.status}`);
      }

      const data = await response.json();
      lastSuccessfulKeyIndex = provider.index;
      return data.text || "";
    } catch (error: any) {
      lastError = error;
      console.warn(`[WHISPER SERVICE] Groq Key ${provider.index + 1} failed: ${error.message}`);
      continue;
    }
  }

  throw lastError || new Error("All transcription keys failed");
}

async function callGroq(apiKey: string, messages: Message[], options: AIServiceOptions) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error?.message || `Groq Error ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

function getRandomFriendlyError() {
  return FRIENDLY_ERROR_MESSAGES[Math.floor(Math.random() * FRIENDLY_ERROR_MESSAGES.length)];
}

// © 2026 Shivanand Verma (starkbbk)

