import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('file') as Blob;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const text = await transcribeAudio(audioFile);
    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("[TRANSCRIBE API ERROR]", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
