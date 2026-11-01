import Groq from 'groq-sdk';

// Cache structure
interface ModelCacheEntry {
  models: string[];
  expiresAt: number;
}

// 15 minutes TTL for models list
const CACHE_TTL_MS = 15 * 60 * 1000;
let globalModelCache: ModelCacheEntry | null = null;

// Allowlist of verified Groq models
export const VERIFIED_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'allam-2-7b',
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama-3.2-11b-vision-preview',
  'deepseek-r1-distill-llama-70b',
  'mixtral-8x7b-32768',
];

/**
 * Fetch and cache available models for an API key or use verified defaults
 */
export async function getCachedAvailableModels(groq: Groq): Promise<string[]> {
  const now = Date.now();
  if (globalModelCache && globalModelCache.expiresAt > now) {
    return globalModelCache.models;
  }

  try {
    const list = await groq.models.list();
    const liveIds: string[] = list.data
      .map((m: any) => m.id)
      .filter((id: string) => {
        const lower = id.toLowerCase();
        return (
          !lower.includes('whisper') &&
          !lower.includes('guard') &&
          !lower.includes('embed') &&
          !lower.includes('orpheus') &&
          !lower.includes('tts')
        );
      });

    if (liveIds.length > 0) {
      globalModelCache = {
        models: liveIds,
        expiresAt: now + CACHE_TTL_MS,
      };
      return liveIds;
    }
  } catch (err: any) {
    console.warn('[ModelCache] Unable to refresh models list from Groq:', err?.message);
  }

  return VERIFIED_MODELS;
}

/**
 * Build priority queue of models to attempt with the requested model first
 */
export async function getModelFallbackQueue(
  groq: Groq,
  requestedModel: string
): Promise<string[]> {
  const available = await getCachedAvailableModels(groq);
  const queue: string[] = [];

  // 1. Requested model first (if available or in allowlist)
  if (available.includes(requestedModel)) {
    queue.push(requestedModel);
  }

  // 2. High TPM priority fallbacks
  const priorityFallbacks = [
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
    'allam-2-7b',
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ];

  for (const fallback of priorityFallbacks) {
    if (available.includes(fallback) && !queue.includes(fallback)) {
      queue.push(fallback);
    }
  }

  // 3. Any remaining available chat models
  for (const id of available) {
    if (!queue.includes(id)) {
      queue.push(id);
    }
  }

  return queue.length > 0 ? queue : [requestedModel || 'qwen/qwen3.8-27b'];
}
