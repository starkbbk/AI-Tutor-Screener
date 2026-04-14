import { AI_SYSTEM_PROMPT, ASSESSMENT_SYSTEM_PROMPT } from './constants';

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function groqChat(messages: GroqMessage[], options: { model?: string; temperature?: number; max_tokens?: number } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing in environment variables.");
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || "llama-3.3-70b-versatile",
      messages: messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error?.message || `Groq API Error: ${response.status} ${response.statusText}`);
    (error as any).status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}
