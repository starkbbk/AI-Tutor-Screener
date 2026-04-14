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
    }, { maxRetries: 2, initialDelay: 2000, factor: 1 }); // 2 second delay on retries

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const assessment = JSON.parse(jsonStr);

    return NextResponse.json({ assessment });
  } catch (error: any) {
    console.error('------- GEMINI ASSESS API ERROR -------');
    console.error('Error Details:', error);
    
    const status = error?.status || error?.response?.status;
    const errorMessage = error?.message || '';

    if (status === 404 || errorMessage.includes('404')) {
      console.error('🚨 404 ERROR: Wrong model name! The requested Gemini model does not exist or is not available for this tier.');
    } else if (status === 401 || errorMessage.includes('401') || errorMessage.includes('API key not valid')) {
      console.error('🚨 401 ERROR: Wrong API key! Your GOOGLE_GEMINI_API_KEY is invalid.');
    } else if (status === 429 || errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      console.error('🚨 429 ERROR: Rate limit reached! Retries exhausted after multiple waits.');
      return NextResponse.json(
        { error: 'Rate limited. Please try again.' },
        { status: 429 }
      );
    } else {
      console.error('🚨 UNKNOWN ERROR:', errorMessage);
    }
    console.error('----------------------------------------');

    return NextResponse.json(
      { error: 'Failed to generate assessment. Please try again.' },
      { status: 500 }
    );
  }
}

