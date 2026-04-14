/**
 * AI Service Handler
 * Implements a multi-layered fallback system: 
 * Groq Key 1 -> Groq Key 2 -> Groq Key 3 -> Google Gemini
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
// In a serverless environment, this persists for the life of the instance.
let lastSuccessfulKeyIndex = 0; // 0, 1, 2 for Groq keys

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.0-flash"; // Using 2.0 Flash as the most robust high-speed fallback

const FRIENDLY_ERROR_MESSAGES = [
  "Just a moment, let me think about that...",
  "Taking a brief pause, one second please...",
  "Thinking deeply... back with you in a second.",
  "Just gathering my thoughts, please hold on...",
];

export async function generateAIResponse(messages: Message[], options: AIServiceOptions = {}) {
  const providers = [...GROQ_KEYS.map((key, i) => ({ type: 'groq' as const, key, index: i })), { type: 'gemini' as const }];
  
  // Reorder providers to start from the last successful Groq key index
  // If lastSuccessfulKeyIndex is higher than available Groq keys, default to 0
  let startIndex = lastSuccessfulKeyIndex < GROQ_KEYS.length ? lastSuccessfulKeyIndex : 0;
  
  // Create the sequence: [LastSuccessfulGroq, NextGroq..., Gemini]
  const executionOrder = [];
  
  // Add Groq keys starting from the last successful one, cycling around
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const idx = (startIndex + i) % GROQ_KEYS.length;
    executionOrder.push({ type: 'groq' as const, key: GROQ_KEYS[idx], index: idx });
  }
  
  // Add Gemini as the absolute final fallback
  executionOrder.push({ type: 'gemini' as const });

  let lastError: any = null;

  for (const provider of executionOrder) {
    try {
      if (provider.type === 'groq') {
        console.log(`[AI SERVICE] Trying Groq Key ${provider.index + 1}...`);
        const result = await callGroq(provider.key, messages, options);
        
        // Success! Update the sticky index
        lastSuccessfulKeyIndex = provider.index;
        console.log(`[AI SERVICE] Success with Groq Key ${provider.index + 1}`);
        return result;
      } else {
        if (!GEMINI_KEY) {
          console.warn("[AI SERVICE] Gemini fallback requested but GEMINI_API_KEY is missing.");
          continue;
        }
        console.log(`[AI SERVICE] Falling back to Gemini (${GEMINI_MODEL})...`);
        const result = await callGemini(GEMINI_KEY, messages, options);
        console.log(`[AI SERVICE] Success with Gemini fallback`);
        return result;
      }
    } catch (error: any) {
      lastError = error;
      const status = error.status || "Unknown";
      console.warn(`[AI SERVICE] Provider ${provider.type} ${provider.type === 'groq' ? provider.index + 1 : ''} failed (Status: ${status}): ${error.message}`);
      
      // If it's not a rate limit (429), we still fall back, but log it clearly
      continue;
    }
  }

  // If we reach here, everything failed
  console.error("[AI SERVICE] ALL PROVIDERS FAILED.", lastError);
  throw new Error(getRandomFriendlyError());
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

async function callGemini(apiKey: string, messages: Message[], options: AIServiceOptions) {
  // Convert OpenAI-style messages to Gemini-style
  // Gemini expects a systemInstruction for the system prompt and then contents for the rest
  const systemMessage = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');
  
  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.max_tokens ?? 1024,
      }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error?.message || `Gemini Error ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  const data = await response.json();
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("Gemini returned an empty response or was filtered.");
  }

  return data.candidates[0].content.parts[0].text;
}

function getRandomFriendlyError() {
  return FRIENDLY_ERROR_MESSAGES[Math.floor(Math.random() * FRIENDLY_ERROR_MESSAGES.length)];
}
