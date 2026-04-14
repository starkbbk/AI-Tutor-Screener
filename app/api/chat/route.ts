import { NextRequest, NextResponse } from 'next/server';
import { getChatModel } from '@/lib/gemini';
import { AI_SYSTEM_PROMPT } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { message, history, candidateName } = await request.json();

    if (!message && history.length === 0) {
      // Initial greeting
      const model = getChatModel();
      const chat = model.startChat({
        history: [],
        systemInstruction: AI_SYSTEM_PROMPT,
      });

      const result = await chat.sendMessage(
        `The candidate's name is ${candidateName}. Start the interview with a warm greeting and ask question 1.`
      );
      const response = result.response.text();

      return NextResponse.json({ response });
    }

    const model = getChatModel();

    // Build chat history for Gemini
    const geminiHistory = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: geminiHistory,
      systemInstruction: AI_SYSTEM_PROMPT,
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error: unknown) {
    console.error('Chat API error:', error);

    // Handle rate limiting
    if (error instanceof Error && 'status' in error && (error as { status: number }).status === 429) {
      // Wait 2 seconds and retry once
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const { message, history, candidateName } = await request.json();
        const model = getChatModel();
        const geminiHistory = history.map((msg: { role: string; content: string }) => ({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));
        const chat = model.startChat({
          history: geminiHistory,
          systemInstruction: AI_SYSTEM_PROMPT,
        });
        const result = await chat.sendMessage(message || `The candidate's name is ${candidateName}. Start the interview.`);
        return NextResponse.json({ response: result.response.text() });
      } catch {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment and try again.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
