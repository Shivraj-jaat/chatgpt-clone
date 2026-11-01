import { NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/firebase';

export async function GET() {
  const hasEnvKey = Boolean(
    process.env.GROQ_API_KEY &&
    process.env.GROQ_API_KEY.trim().length > 0 &&
    !process.env.GROQ_API_KEY.includes('your_groq_api_key')
  );

  return NextResponse.json({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'production',
    groqConfigured: hasEnvKey,
    firebaseConfigured: isFirebaseConfigured,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
