import { NextRequest, NextResponse } from 'next/server';
import { getChatModel } from '@/lib/gemini';
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
    console.log("API Key loaded:", process.env.GOOGLE_GEMINI_API_KEY ? "YES" : "NO");

    if (!message && history.length === 0) {
      // Initial greeting - CACHED TO SAVE API LIMITS!
      console.log('[CHAT API] No prior history. Returning CACHED Initial Greeting to save API Limits!');
      
      const safeName = candidateName || 'there';
      const cachedGreeting = `Hi ${safeName}! Welcome to the Cuemath tutor screening. Before we dive into the math, could you tell me a little bit about yourself and why you want to join our community of coaches?`;
      
      console.log('[CHAT API] Final CACHED Greeting resolved to:', cachedGreeting);
      return NextResponse.json({ response: cachedGreeting });
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
    }, { maxRetries: 2, initialDelay: 2000, factor: 1 }); // 2 second delay on retries

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('------- GEMINI API ERROR -------');
    console.error('Error Details:', error);
    
    const status = error?.status || error?.response?.status;
    const errorMessage = error?.message || '';

    if (status === 404 || errorMessage.includes('404')) {
      console.error('🚨 404 ERROR: Wrong model name! The requested Gemini model does not exist or is not available for this tier.');
    } else if (status === 401 || errorMessage.includes('401') || errorMessage.includes('API key not valid')) {
      console.error('🚨 401 ERROR: Wrong API key! Your GOOGLE_GEMINI_API_KEY is invalid.');
    } else if (status === 429 || errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      console.error('🚨 429 ERROR: Rate limit reached! Retries exhausted after multiple 2-second waits.');
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    } else {
      console.error('🚨 UNKNOWN ERROR:', errorMessage);
    }
    console.error('---------------------------------');

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

