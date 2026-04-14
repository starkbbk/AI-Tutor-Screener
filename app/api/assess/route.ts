import { NextRequest, NextResponse } from 'next/server';
import { groqChat } from '@/lib/groq';
import { ASSESSMENT_SYSTEM_PROMPT } from '@/lib/constants';
import { withRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  let requestData;
  try {
    requestData = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { transcript, candidateName, duration } = requestData;

  try {
    console.log("=== API ASSESS CALLED ===");
    console.log("GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
    console.log("GROQ_API_KEY starts with:", process.env.GROQ_API_KEY?.substring(0, 10));

    // Format transcript for assessment
    const formattedTranscript = transcript
      .map((msg: { role: string; content: string }) =>
        `${msg.role === 'ai' ? 'AI Interviewer' : 'Candidate'}: ${msg.content}`
      )
      .join('\n\n');

    const prompt = `
Candidate Name: ${candidateName}
Interview Duration: ${duration}

--- INTERVIEW TRANSCRIPT ---

${formattedTranscript}

--- END TRANSCRIPT ---

Generate the assessment JSON now.`;

    const responseText = await withRetry(async () => {
      console.log('[ASSESS API] Calling Groq REST API...');
      return await groqChat([
        { role: 'system', content: ASSESSMENT_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ], {
        model: "llama-3.3-70b-versatile",
        temperature: 0.1, // Low temperature for consistent JSON
        max_tokens: 3000
      });
    }, { maxRetries: 2, initialDelay: 2000, factor: 1.5 });

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const assessment = JSON.parse(jsonStr);
    console.log('[ASSESS API] Success');
    return NextResponse.json({ assessment });

  } catch (error: any) {
    console.error('------- GROQ ASSESS API ERROR -------');
    console.error('FULL ERROR:', error);
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    
    const status = error?.status;
    const errorMessage = error?.message || '';

    if (status === 404 || errorMessage.includes('404')) {
      console.error('🚨 404 ERROR: Wrong model name or endpoint for Groq!');
    } else if (status === 401 || errorMessage.includes('401')) {
      console.error('🚨 401 ERROR: Wrong Groq API key!');
    } else if (status === 429 || errorMessage.includes('429')) {
      console.error('🚨 429 ERROR: Groq Rate limit reached!');
      return NextResponse.json(
        { error: 'Rate limited. Please try again.' },
        { status: 429 }
      );
    } else {
      console.error('🚨 UNKNOWN ERROR:', errorMessage);
    }
    console.error('-------------------------------------');

    return NextResponse.json(
      { error: `Assessment Failed: ${error.message}` },
      { status: 500 }
    );
  }
}


