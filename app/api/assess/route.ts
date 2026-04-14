import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/ai-service';
import { ASSESSMENT_SYSTEM_PROMPT } from '@/lib/constants';

export async function POST(request: NextRequest) {
  let requestData;
  try {
    requestData = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { transcript, candidateName, duration } = requestData;

  try {
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

    const responseText = await generateAIResponse([
      { role: 'system', content: ASSESSMENT_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.1, // Low temperature for consistent JSON
      max_tokens: 3000
    });

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Sometimes AI might return JSON directly without code blocks
      const curlyMatch = responseText.match(/\{[\s\S]*\}/);
      if (curlyMatch) jsonStr = curlyMatch[0];
    }

    const assessment = JSON.parse(jsonStr);
    return NextResponse.json({ assessment });

  } catch (error: any) {
    console.error('[ASSESS API ERROR]', error.message);

    // Return friendly error message consistently
    return NextResponse.json(
      { error: error.message || "Just a moment, let me think about that..." },
      { status: 500 }
    );
  }
}


