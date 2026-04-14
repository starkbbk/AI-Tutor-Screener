import { NextRequest, NextResponse } from 'next/server';
import { getChatModel } from '@/lib/gemini';
import { AI_SYSTEM_PROMPT } from '@/lib/constants';
import { withRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  let requestData;
  console.log('[CHAT API] Received a new POST request');
  try {
    requestData = await request.json();
    console.log('[CHAT API] Request data successfully parsed:', JSON.stringify({ ...requestData, history: requestData.history?.length + ' items' }));
  } catch (e) {
    console.error('[CHAT API] Failed to parse JSON request', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { message, history, candidateName } = requestData;

  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.error('[CHAT API] Critical Error: GOOGLE_GEMINI_API_KEY is definitely missing or undefined!');
    } else {
      console.log('[CHAT API] GOOGLE_GEMINI_API_KEY is present.');
    }

    if (!message && history.length === 0) {
      // Initial greeting
      console.log('[CHAT API] No prior history, treating this as the Initial Greeting.');
      const model = getChatModel();
      console.log('[CHAT API] Chat Model initialized successfully.');
      
      const response = await withRetry(async () => {
        console.log('[CHAT API] Attempting to start chat and send initial instruction...');
        const chat = model.startChat({
          history: [],
        });

        const prompt = `The candidate's name is ${candidateName || 'Unknown'}. Start the interview with a warm greeting and ask question 1.`;
        console.log('[CHAT API] Sending prompt:', prompt);
        
        const result = await chat.sendMessage(prompt);
        console.log('[CHAT API] Received result from Gemini successfully.');
        return result.response.text();
      });

      console.log('[CHAT API] Final Greeting resolved to:', response);
      return NextResponse.json({ response });
    }

    console.log('[CHAT API] Processing standard turn with', history.length, 'history items.');
    const model = getChatModel();

    // Ensure Gemini History always starts with the initial user prompt 
    // to maintain the user -> model alternating sequence.
    const initialPrompt = {
      role: 'user',
      parts: [{ text: `The candidate's name is ${candidateName}. Start the interview with a warm greeting and ask question 1.` }]
    };

    const formattedHistory = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const rawGeminiHistory = [initialPrompt, ...formattedHistory];
    
    // Gemini 400 error occurs if there are consecutive same roles in history.
    // We must merge consecutive 'user' or 'model' messages.
    const geminiHistory = [];
    for (const msg of rawGeminiHistory) {
      if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === msg.role) {
        geminiHistory[geminiHistory.length - 1].parts[0].text += "\n\n" + msg.parts[0].text;
      } else {
        geminiHistory.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
      }
    }

    // A chat.sendMessage() call acts as a 'user' role. So geminiHistory MUST end with a 'model' role,
    // otherwise Gemini complains about consecutive 'user' roles.
    let finalMessage = message;
    if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === 'user') {
       // If history ends with 'user', we can't use sendMessage safely without causing consecutive users.
       // So we pop the last user message, append the new message to it, and use that as the finalMessage.
       const lastUserMsg = geminiHistory.pop();
       if (finalMessage) {
           finalMessage = lastUserMsg.parts[0].text + "\n\n" + finalMessage;
       } else {
           finalMessage = lastUserMsg.parts[0].text;
       }
    }

    const response = await withRetry(async () => {
      const chat = model.startChat({
        history: geminiHistory,
      });

      const result = await chat.sendMessage(finalMessage || "Continue");
      return result.response.text();
    });

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    if (error?.status === 429 || error?.message?.includes('429')) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

