import { NextRequest, NextResponse } from 'next/server';
import { groqChat, GroqMessage } from '@/lib/groq';
import { AI_SYSTEM_PROMPT } from '@/lib/constants';
import { withRetry } from '@/lib/retry';

let globalRequestCount = 0;

export async function POST(request: NextRequest) {
  let requestData;
  globalRequestCount++;
  
  // Debug logs removed for production. Error handling retains critical info.
  
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

    const responseText = await withRetry(async () => {
      return await groqChat(messages, {
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 500
      });
    }, { maxRetries: 2, initialDelay: 1000, factor: 1.5 });

    let questionNumber: number | 'DONE' | null = null;
    let cleanResponse = responseText;

    // Parse out [Qx] or [DONE] tag
    // Match something like [Q1], [q1], [Q6], [DONE] at the end of the text or anywhere
    const tagMatch = responseText.match(/\[Q([1-6])\]|\[DONE\]/i);
    if (tagMatch) {
      if (tagMatch[0].toUpperCase() === '[DONE]') {
        questionNumber = 'DONE';
      } else if (tagMatch[1]) {
        questionNumber = parseInt(tagMatch[1], 10);
      }
      // Remove the tag from the response so the user doesn't see or hear it
      cleanResponse = responseText.replace(/\[Q([1-6])\]|\[DONE\]/gi, '').trim();
    }

    return NextResponse.json({ response: cleanResponse, questionNumber });

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
