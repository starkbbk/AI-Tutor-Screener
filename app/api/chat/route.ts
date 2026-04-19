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
  const totalSteps = 6;
  
  let instructions = "";
  if (currentQuestion === 0) {
    instructions = `Start by warmly greeting ${safeName}. Introduce yourself as Maya, a friendly interviewer from Cuemath, and mention that you will be conducting this screening today. 
    Then, tell them: "Just a heads-up: after you finish speaking, please wait for 5 seconds and your answer will be submitted automatically. Also, beware — if you do not say anything for 10 seconds, the system will assume you want to move to the next question."
    Finally, say: "Let's start with your first question," and ask Question 1: "${INTERVIEW_QUESTIONS[1]}".`;
  } else if (currentQuestion >= 1 && currentQuestion < totalSteps) {
    const nextQuestion = currentQuestion + 1;
    const transition = nextQuestion === 6 ? "Lastly, for our final question..." : "Moving to our next question...";
    
    instructions = `The candidate just responded to Question ${currentQuestion}. 
    1. Briefly acknowledge their response (1 short sentence max).
    2. Then, use this transition: "${transition}" and immediately ask Question ${nextQuestion}: "${INTERVIEW_QUESTIONS[nextQuestion]}".
    
    STRICT RULES:
    - NEVER repeat Question ${currentQuestion} or any related follow-ups.
    - You MUST move to the topic of Question ${nextQuestion} now.
    - Even if the candidate's last answer was very short, do not try to improve it. Just move forward.`;
    
  } else if (currentQuestion === totalSteps) {
    instructions = `The interview is over. The candidate has answered all 6 questions. 
    Give a warm closing message to ${safeName}, thank them for their time, and tell them they will hear from us soon via their dashboard. 
    Explicitly say that the interview has concluded.`;
  } else {
    instructions = `The interview is over. Do not ask any more questions. Redirect them to the results.`;
  }

  return `You are Maya, a professional and warm interviewer for Cuemath.
  
ABSOLUTE RULES:
1. ENGLISH ONLY.
2. NEVER repeat a question. Every candidate response MUST lead to the NEXT question topic.
3. Keep responses SHORT (max 2 sentences).
4. ${instructions}

${Object.entries(INTERVIEW_QUESTIONS).map(([num, q]) => `Question ${num}: ${q}`).join('\n')}

At the very end of your response, append a tag: [MOVE_FORWARD: TRUE].`;
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

    let cleanResponse = responseText;

    if (responseText.includes('[MOVE_FORWARD: TRUE]')) {
      cleanResponse = responseText.replace('[MOVE_FORWARD: TRUE]', '').trim();
    }

    return NextResponse.json({ 
      response: cleanResponse
    });

  } catch (error: any) {
    console.error("[CHAT API ERROR]", error.message);
    return NextResponse.json(
      { error: error.message || "Taking a brief pause, one second please..." },
      { status: 500 }
    );
  }
}

// © 2025 Shivanand Verma (starkbbk)

