import { NextRequest, NextResponse } from 'next/server';
import { getAssessmentModel } from '@/lib/gemini';
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

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const responseText = result.response.text();

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const assessment = JSON.parse(jsonStr);

    return NextResponse.json({ assessment });
  } catch (error: unknown) {
    console.error('Assessment API error:', error);

    // Handle rate limiting with retry
    if (error instanceof Error && 'status' in error && (error as { status: number }).status === 429) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const model = getAssessmentModel();
        const formattedTranscript = transcript
          .map((msg: { role: string; content: string }) =>
            `${msg.role === 'ai' ? 'AI Interviewer' : 'Candidate'}: ${msg.content}`
          )
          .join('\n\n');
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `Candidate: ${candidateName}\nDuration: ${duration}\n\n${formattedTranscript}\n\nGenerate the assessment JSON now.` }] }]
        });
        let jsonStr = result.response.text();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();
        return NextResponse.json({ assessment: JSON.parse(jsonStr) });
      } catch {
        return NextResponse.json({ error: 'Rate limited. Please try again.' }, { status: 429 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate assessment. Please try again.' },
      { status: 500 }
    );
  }
}
