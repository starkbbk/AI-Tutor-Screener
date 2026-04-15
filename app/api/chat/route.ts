import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse, Message } from '@/lib/ai-service';

const INTERVIEW_QUESTIONS: Record<number, string> = {
  1: "Tell me a little about yourself — what is your background and what interests you about tutoring?",
  2: "Imagine you are teaching a 9-year-old who has never heard of fractions before. How would you explain what a fraction is?",
  3: "A student has been stuck on the same problem for 10 minutes and is frustrated saying I cannot do this. What would you do?",
  4: "How would you make multiplication tables fun or interesting for a kid?",
  5: "A parent says their child understands in class but forgets by next week. What would you suggest?",
  6: "Your teaching approach is not working mid-session. Walk me through what you would do."
};

function getDynamicSystemPrompt(currentQuestion: number, candidateName: string) {
  const safeName = candidateName || 'Candidate';
  
  let instructions = "";
  if (currentQuestion === 0) {
    instructions = `Start by warmly greeting ${safeName}. Then ask Question 1: "${INTERVIEW_QUESTIONS[1]}".`;
  } else if (currentQuestion >= 1 && currentQuestion <= 6) {
    instructions = `You are currently on Question ${currentQuestion} of 6. If the candidate just answered, briefly acknowledge their response. 
    IF their answer was too short or unclear, you MUST ask ONE brief follow-up question to help them elaborate. 
    Otherwise, just say a brief acknowledgment like "Got it" or "I see" and STOP.
    DO NOT ask the next major question.
    
    Current Question Topic: ${INTERVIEW_QUESTIONS[currentQuestion]}`;
  } else if (currentQuestion === 7) {
    instructions = `The interview is over. Give a warm closing message to ${safeName}, thank them for their time, and tell them they will hear from us soon.`;
  }

  return `You are a professional, friendly interviewer for Cuemath.
  
ABSOLUTE RULES:
1. ENGLISH ONLY. Never use any other language.
2. NEVER restart the interview. NEVER say "we haven't started". NEVER go back to a previous question. Always move forward.
3. Keep responses SHORT (2-3 sentences max).
4. Do NOT ask multiple questions. 
5. ${instructions}

${Object.entries(INTERVIEW_QUESTIONS).map(([num, q]) => `Question ${num}: ${q}`).join('\n')}

At the very end of your response, append a tag: [FOLLOW_UP: TRUE] if you asked a follow-up question, or [FOLLOW_UP: FALSE] if you just acknowledged and stopped.`;
}

export async function POST(request: NextRequest) {
  let requestData;
  
  try {
    requestData = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { message, history, candidateName, currentQuestion } = requestData;

  try {
    const qNum = typeof currentQuestion === 'number' ? currentQuestion : 0;
    const systemPrompt = getDynamicSystemPrompt(qNum, candidateName);

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
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

    let followUpAsked = false;
    let cleanResponse = responseText;

    if (responseText.includes('[FOLLOW_UP: TRUE]')) {
      followUpAsked = true;
      cleanResponse = responseText.replace('[FOLLOW_UP: TRUE]', '').trim();
    } else if (responseText.includes('[FOLLOW_UP: FALSE]')) {
      followUpAsked = false;
      cleanResponse = responseText.replace('[FOLLOW_UP: FALSE]', '').trim();
    }

    return NextResponse.json({ 
      response: cleanResponse, 
      followUpAsked 
    });

  } catch (error: any) {
    console.error("[CHAT API ERROR]", error.message);
    return NextResponse.json(
      { error: error.message || "Taking a brief pause, one second please..." },
      { status: 500 }
    );
  }
}
