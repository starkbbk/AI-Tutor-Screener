import { NextRequest, NextResponse } from 'next/server';
import { groqChat, GroqMessage } from '@/lib/groq';
import { AI_SYSTEM_PROMPT } from '@/lib/constants';
import { withRetry } from '@/lib/retry';

let globalRequestCount = 0;

export async function POST(request: NextRequest) {
  let requestData;
  globalRequestCount++;
  
  console.log("=== API CHAT CALLED ===");
  console.log(`Total Server Requests: ${globalRequestCount}`);
  console.log("GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
  console.log("GROQ_API_KEY starts with:", process.env.GROQ_API_KEY?.substring(0, 10));
  
  try {
    requestData = await request.json();
    console.log('[CHAT API] History length:', requestData.history?.length);
  } catch (e) {
    console.error('[CHAT API] Failed to parse JSON request', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { message, history, candidateName } = requestData;

  try {
    if (!message && history.length === 0) {
      console.log('[CHAT API] Returning cached greeting');
      const safeName = candidateName || 'there';
      const cachedGreeting = `Hi ${safeName}! Welcome to the Cuemath tutor screening. Before we dive into the math, could you tell me a little bit about yourself and why you want to join our community of coaches?`;
      return NextResponse.json({ response: cachedGreeting });
    }

    const messages: GroqMessage[] = [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: message || "Continue" }
    ];

    const response = await withRetry(async () => {
      console.log('[CHAT API] Calling Groq REST API...');
      return await groqChat(messages, {
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 500
      });
    }, { maxRetries: 2, initialDelay: 1000, factor: 1.5 });

    console.log('[CHAT API] Success');
    return NextResponse.json({ response });

  } catch (error: any) {
    console.error("------- GROQ API ERROR -------");
    console.error("FULL ERROR:", error);
    console.error("Error message:", error.message);
    console.error("Error status:", error.status);
    console.error("------------------------------");

    return NextResponse.json(
      { error: `API Error: ${error.message}` },
      { status: 500 }
    );
  }
}
