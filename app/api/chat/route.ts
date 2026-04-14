import { NextRequest, NextResponse } from 'next/server';
import { groqChat, GroqMessage } from '@/lib/groq';
import { AI_SYSTEM_PROMPT } from '@/lib/constants';
import { withRetry } from '@/lib/retry';

let globalRequestCount = 0;

export async function POST(request: NextRequest) {
  let requestData;
  globalRequestCount++;
  console.log(`[CHAT API] Received a new POST request. (Total Server Requests: ${globalRequestCount})`);
  
  try {
    requestData = await request.json();
    console.log('[CHAT API] Request data successfully parsed:', JSON.stringify({ ...requestData, history: requestData.history?.length + ' items' }));
  } catch (e) {
    console.error('[CHAT API] Failed to parse JSON request', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { message, history, candidateName } = requestData;

  try {
    console.log("Groq API Key loaded:", process.env.GROQ_API_KEY ? "YES" : "NO");

    if (!message && history.length === 0) {
      // Initial greeting - CACHED TO SAVE API LIMITS!
      console.log('[CHAT API] No prior history. Returning CACHED Initial Greeting to save API Limits!');
      
      const safeName = candidateName || 'there';
      const cachedGreeting = `Hi ${safeName}! Welcome to the Cuemath tutor screening. Before we dive into the math, could you tell me a little bit about yourself and why you want to join our community of coaches?`;
      
      console.log('[CHAT API] Final CACHED Greeting resolved to:', cachedGreeting);
      return NextResponse.json({ response: cachedGreeting });
    }

    console.log('[CHAT API] Processing standard turn with', history.length, 'history items.');

    // Prepare messages for Groq
    const messages: GroqMessage[] = [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: message || "Continue" }
    ];

    const response = await withRetry(async () => {
      console.log('[CHAT API] Calling Groq API...');
      return await groqChat(messages, {
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 500
      });
    }, { maxRetries: 2, initialDelay: 1000, factor: 1.5 });

    return NextResponse.json({ response });

  } catch (error: any) {
    console.error('------- GROQ API ERROR -------');
    console.error('Error Details:', error);
    
    const status = error?.status;
    const errorMessage = error?.message || '';

    if (status === 404 || errorMessage.includes('404')) {
      console.error('🚨 404 ERROR: Wrong model name or endpoint for Groq!');
    } else if (status === 401 || errorMessage.includes('401')) {
      console.error('🚨 401 ERROR: Wrong Groq API key!');
    } else if (status === 429 || errorMessage.includes('429')) {
      console.error('🚨 429 ERROR: Groq Rate limit reached!');
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    } else {
      console.error('🚨 UNKNOWN ERROR:', errorMessage);
    }
    console.error('------------------------------');

    return NextResponse.json(
      { error: 'AI is currently unavailable. Please try again later.' },
      { status: 500 }
    );
  }
}

}

