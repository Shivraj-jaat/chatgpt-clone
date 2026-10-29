import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

function getGroqClient(clientKey?: string | null): Groq {
  const apiKey = clientKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API Key is not set. Please provide it in Settings or set GROQ_API_KEY in .env file.');
  }
  return new Groq({ apiKey });
}

export async function POST(req: NextRequest) {
  const clientKey = req.headers.get('x-groq-api-key');

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const formApiKey = formData.get('apiKey') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file uploaded.' }, { status: 400 });
    }

    const groq = getGroqClient(clientKey || formApiKey);

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      temperature: 0.0,
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

