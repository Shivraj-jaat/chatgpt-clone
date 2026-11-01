import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { rateLimiter, getClientIp } from '@/lib/rateLimit';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB limit

function getGroqClient(clientKey?: string | null): Groq {
  const apiKey = clientKey || process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_groq_api_key')) {
    throw new Error('Groq API Key is not configured. Please supply your API key in Settings or configure GROQ_API_KEY on the server.');
  }
  return new Groq({ apiKey });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientKey = req.headers.get('x-groq-api-key');
  const clientIp = getClientIp(req.headers);

  // Rate Limiting for transcription (expensive audio inference)
  const isCustomKey = Boolean(clientKey && clientKey.trim());
  const rateLimitConfig = isCustomKey
    ? { maxRequests: 30, windowMs: 60_000 }
    : { maxRequests: 10, windowMs: 60_000 };

  const rateCheck = rateLimiter.check(`transcribe_${clientIp}_${isCustomKey ? 'custom' : 'shared'}`, rateLimitConfig);

  const rateHeaders = {
    'X-Request-Id': requestId,
    'X-RateLimit-Limit': String(rateCheck.limit),
    'X-RateLimit-Remaining': String(rateCheck.remaining),
    'X-RateLimit-Reset': String(rateCheck.resetTime),
  };

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: isCustomKey
          ? 'Transcription rate limit exceeded for custom key. Please slow down.'
          : 'Server transcription rate limit exceeded. Please wait a moment or supply a personal Groq API key in Settings.',
        code: 'RATE_LIMIT_EXCEEDED',
        requestId,
      },
      {
        status: 429,
        headers: {
          ...rateHeaders,
          'Retry-After': String(Math.max(1, rateCheck.resetTime - Math.floor(Date.now() / 1000))),
        },
      }
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const formApiKey = formData.get('apiKey') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file uploaded.', code: 'MISSING_AUDIO', requestId },
        { status: 400, headers: rateHeaders }
      );
    }

    // Validate audio file size
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        {
          error: `Audio file size exceeds the 25MB safety limit (File size: ${(audioFile.size / (1024 * 1024)).toFixed(1)}MB).`,
          code: 'PAYLOAD_TOO_LARGE',
          requestId,
        },
        { status: 413, headers: rateHeaders }
      );
    }

    // Validate MIME type
    const mime = audioFile.type.toLowerCase();
    const isValidAudioType =
      mime.startsWith('audio/') ||
      mime.includes('webm') ||
      mime.includes('ogg') ||
      mime.includes('wav') ||
      mime.includes('mp4') ||
      mime.includes('m4a') ||
      mime.includes('mpeg');

    if (mime && !isValidAudioType) {
      return NextResponse.json(
        {
          error: `Unsupported audio format: ${mime}. Please provide a standard audio recording (WAV, MP3, M4A, WebM, OGG).`,
          code: 'UNSUPPORTED_MEDIA_TYPE',
          requestId,
        },
        { status: 415, headers: rateHeaders }
      );
    }

    const groq = getGroqClient(clientKey || formApiKey);

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      temperature: 0.0,
    });

    return NextResponse.json(
      { text: transcription.text, requestId },
      { headers: rateHeaders }
    );
  } catch (error: any) {
    console.error(`[Transcription Error] [Request: ${requestId}]`, error?.message);
    const friendly =
      error?.status === 429 || error?.code === 'rate_limit_exceeded'
        ? 'Whisper rate limit reached. Please wait a moment and try again.'
        : error?.message || 'Failed to transcribe audio.';

    return NextResponse.json(
      { error: friendly, code: error?.code || 'TRANSCRIPTION_ERROR', requestId },
      { status: error?.status || 500, headers: rateHeaders }
    );
  }
}
