import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse, Message } from '@/lib/ai-service';
import { AI_SYSTEM_PROMPT } from '@/lib/constants';

export async function POST(request: NextRequest) {
  let requestData;
  
  try {
    requestData = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { message, history, candidateName } = requestData;

  try {
    if (!message && history.length === 0) {
      const safeName = candidateName || 'there';
      const cachedGreeting = `Hi ${safeName}! Welcome to the Cuemath tutor screening. Before we dive into the math, could you tell me a little bit about yourself and why you want to join our community of coaches?`;
      return NextResponse.json({ response: cachedGreeting });
    }

    const messages: Message[] = [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: message || "Continue" }
    ];

    const responseText = await generateAIResponse(messages, {
      temperature: 0.7,
      max_tokens: 500
    });

    let questionNumber: number | 'DONE' | null = null;
    let cleanResponse = responseText;

    // Parse out [Qx] or [DONE] tag
    const tagMatch = responseText.match(/\[Q([1-6])\]|\[DONE\]/i);
    if (tagMatch) {
      if (tagMatch[0].toUpperCase() === '[DONE]') {
        questionNumber = 'DONE';
      } else if (tagMatch[1]) {
        questionNumber = parseInt(tagMatch[1], 10);
      }
      cleanResponse = responseText.replace(/\[Q([1-6])\]|\[DONE\]/gi, '').trim();
    }

    return NextResponse.json({ response: cleanResponse, questionNumber });

  } catch (error: any) {
    console.error("[CHAT API ERROR]", error.message);

    // Return friendly error message consistently
    return NextResponse.json(
      { error: error.message || "Taking a brief pause, one second please..." },
      { status: 500 }
    );
  }
}
