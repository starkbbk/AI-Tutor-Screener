import { NextRequest, NextResponse } from 'next/server';
import { getAssessmentModel } from '@/lib/gemini';
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
    const model = getAssessmentModel();

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
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      return result.response.text();
    });

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const assessment = JSON.parse(jsonStr);

    return NextResponse.json({ assessment });
  } catch (error: any) {
    console.error('Assessment API error:', error);

    if (error?.status === 429 || error?.message?.includes('429')) {
      return NextResponse.json(
        { error: 'Rate limited. Please try again.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate assessment. Please try again.' },
      { status: 500 }
    );
  }
}

