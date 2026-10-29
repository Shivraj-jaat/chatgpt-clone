import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { KNOWN_MODELS, DEFAULT_FALLBACK_MODELS } from '@/constants';
import { Model } from '@/types';

function getGroqClient(clientKey?: string | null): Groq | null {
  const apiKey = clientKey || process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_groq_api_key')) {
    return null;
  }
  return new Groq({ apiKey });
}

export async function GET(req: NextRequest) {
  const clientKey = req.headers.get('x-groq-api-key');
  const groq = getGroqClient(clientKey);

  if (!groq) {
    return NextResponse.json({
      models: DEFAULT_FALLBACK_MODELS,
      availableGroqModelIds: [],
    });
  }

  try {
    const list = await groq.models.list();
    const liveIds: string[] = list.data.map((m: any) => m.id);

    // Filter out non-chat models (guards, safeguards, whisper audio, TTS/orpheus)
    const chatModelIds = liveIds.filter((id) => {
      const lower = id.toLowerCase();
      if (lower.includes('whisper')) return false;
      if (lower.includes('guard')) return false;
      if (lower.includes('embed')) return false;
      if (lower.includes('orpheus')) return false; // TTS/audio model, not chat
      if (lower.includes('tts')) return false;
      return true;
    });

    if (chatModelIds.length === 0) {
      return NextResponse.json({
        models: DEFAULT_FALLBACK_MODELS,
        availableGroqModelIds: liveIds,
      });
    }

    // Sort: preferred high-TPM models first
    const PREFERRED_ORDER = [
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
      'allam-2-7b',
      'openai/gpt-oss-120b',
    ];
    const sortedModelIds = [
      ...PREFERRED_ORDER.filter((p) => chatModelIds.includes(p)),
      ...chatModelIds.filter((id) => !PREFERRED_ORDER.includes(id)),
    ];

    // Build rich model cards for every available model
    const dynamicModels: Model[] = sortedModelIds.map((id, index) => {
      const known = KNOWN_MODELS[id];
      if (known) {
        return {
          id,
          name: known.name || id,
          shortName: known.shortName || id,
          badge: known.badge || 'Fast',
          badgeColor: known.badgeColor || 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
          description: known.description || `Groq LPU accelerated model (${id}).`,
          speed: known.speed || '~500 tps',
          context: known.context || '128k',
          isDefault: index === 0,
          supportsVision: Boolean(known.supportsVision),
          supportsReasoning: Boolean(known.supportsReasoning),
        };
      }

      // Fallback formatting for any new or custom Groq model
      const isLarge = id.includes('70b') || id.includes('120b');
      return {
        id,
        name: `ChatGPT (${id})`,
        shortName: id.split('/').pop() || id,
        badge: isLarge ? 'Flagship' : 'Fast',
        badgeColor: isLarge
          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
          : 'bg-blue-600/20 text-blue-400 border-blue-500/30',
        description: `Groq LPU accelerated inference for ${id}.`,
        speed: isLarge ? '~300 tps' : '~700 tps',
        context: '128k',
        isDefault: index === 0,
        supportsVision: id.includes('vision'),
        supportsReasoning: id.includes('r1') || id.includes('reasoning') || id.includes('120b'),
      };
    });

    return NextResponse.json({
      models: dynamicModels,
      availableGroqModelIds: liveIds,
      count: dynamicModels.length,
    });
  } catch (error: any) {
    console.warn('Failed to list live Groq models:', error?.message);
    return NextResponse.json({
      models: DEFAULT_FALLBACK_MODELS,
      availableGroqModelIds: [],
      error: error?.message,
    });
  }
}
