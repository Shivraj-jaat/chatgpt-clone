import { NextResponse } from 'next/server';

export async function GET() {
  const hasEnvKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  return NextResponse.json({
    status: 'ok',
    hasEnvKey,
    timestamp: new Date().toISOString(),
  });
}

