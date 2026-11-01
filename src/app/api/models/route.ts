import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { KNOWN_MODELS, DEFAULT_FALLBACK_MODELS } from '@/constants';
import { Model } from '@/types';
import { rateLimiter, getClientIp } from '@/lib/rateLimit';

function getGroqClient(clientKey?: string | null): Groq | null {
  const apiKey = clientKey || process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_groq_api_key')) {
    return null;
  }
  return new Groq({ apiKey });
}

// In-memory cache for dynamic model listing
let cachedModelsResponse: {
  data: { models: Model[]; availableGroqModelIds: string[]; count: number };
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientKey = req.headers.get('x-groq-api-key');
  const clientIp = getClientIp(req.headers);

  // Rate limiting: 60 req/min for models
  const rateCheck = rateLimiter.check(`models_${clientIp}`, { maxRequests: 60, windowMs: 60_000 });
  const rateHeaders = {
    'X-Request-Id': requestId,
    'X-RateLimit-Limit': String(rateCheck.limit),
    'X-RateLimit-Remaining': String(rateCheck.remaining),
    'X-RateLimit-Reset': String(rateCheck.resetTime),
  };

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for model catalog.', requestId },
      { status: 429, headers: rateHeaders }
    );
  }

  // Return cached result if available and using shared server credentials
  const now = Date.now();
  if (!clientKey && cachedModelsResponse && cachedModelsResponse.expiresAt > now) {
    return NextResponse.json(cachedModelsResponse.data, { headers: rateHeaders });
  }

  const groq = getGroqClient(clientKey);

  if (!groq) {
    return NextResponse.json(
      {
        models: DEFAULT_FALLBACK_MODELS,
        availableGroqModelIds: [],
        requestId,
      },
      { headers: rateHeaders }
    );
  }

  try {
    const list = await groq.models.list();
    const liveIds: string[] = list.data.map((m: any) => m.id);

    // Filter out non-chat models
    const chatModelIds = liveIds.filter((id) => {
      const lower = id.toLowerCase();
      if (lower.includes('whisper')) return false;
      if (lower.includes('guard')) return false;
      if (lower.includes('embed')) return false;
      if (lower.includes('orpheus')) return false;
      if (lower.includes('tts')) return false;
      return true;
    });

    if (chatModelIds.length === 0) {
      return NextResponse.json(
        {
          models: DEFAULT_FALLBACK_MODELS,
          availableGroqModelIds: liveIds,
          requestId,
        },
        { headers: rateHeaders }
      );
    }

    // Sort: preferred high-TPM models first
    const PREFERRED_ORDER = [
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
      'allam-2-7b',
      'openai/gpt-oss-120b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ];

    const sortedModelIds = [
      ...PREFERRED_ORDER.filter((p) => chatModelIds.includes(p)),
      ...chatModelIds.filter((id) => !PREFERRED_ORDER.includes(id)),
    ];

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

    const responsePayload = {
      models: dynamicModels,
      availableGroqModelIds: liveIds,
      count: dynamicModels.length,
    };

    // Store in cache for shared requests
    if (!clientKey) {
      cachedModelsResponse = {
        data: responsePayload,
        expiresAt: now + CACHE_TTL_MS,
      };
    }

    return NextResponse.json(responsePayload, { headers: rateHeaders });
  } catch (error: any) {
    console.warn('[Models Route] Failed to list live Groq models:', error?.message);
    return NextResponse.json(
      {
        models: DEFAULT_FALLBACK_MODELS,
        availableGroqModelIds: [],
        error: error?.message,
        requestId,
      },
      { headers: rateHeaders }
    );
  }
}
