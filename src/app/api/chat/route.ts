import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';

function getGroqClient(clientKey?: string | null): Groq {
  const apiKey = clientKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Groq API Key is not set. Please provide it in Settings or set GROQ_API_KEY in .env file.'
    );
  }
  return new Groq({ apiKey });
}

// Models tried in priority order (highest TPM / most reliable first)
const FALLBACK_PRIORITY = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'allam-2-7b',
  'openai/gpt-oss-120b',
];

/**
 * Detect if user wants an AI generated image
 */
function detectImagePrompt(text: string): string | null {
  if (!text) return null;
  const t = text.trim();

  // 1. Slash command
  const slashMatch = t.match(/^\/image\s+(.+)/i);
  if (slashMatch) return slashMatch[1].trim();

  // 2. Clear image generation intent phrases
  const regexPatterns = [
    // "generate/create/make/draw/paint an image/picture/photo of..."
    /(?:can\s+you\s+)?(?:please\s+)?(?:generate|create|make|draw|paint|render|design)\s+(?:an?\s+)?(?:image|picture|photo|painting|illustration|artwork|wallpaper)\s+(?:of|showing|depicting|with)?\s+(.+)/i,
    // "show me an image/picture of..."
    /(?:can\s+you\s+)?(?:please\s+)?(?:show\s+me)\s+(?:an?\s+)?(?:image|picture|photo)\s+(?:of|showing)?\s+(.+)/i,
    // Direct "image/picture/photo of..."
    /^(?:image|picture|photo|illustration|drawing)\s+of\s+(.+)/i,
    // Hinglish: "photo banao...", "image generate karo..."
    /(?:photo|image|picture)\s+(?:banao|generate\s+karo|create\s+karo)\s*(?:of)?\s*(.+)/i,
    /(.+?)\s+(?:ki\s+)?(?:photo|image|picture)\s+(?:banao|dikhao|generate\s+karo)/i,
  ];

  for (const regex of regexPatterns) {
    const match = t.match(regex);
    if (match && match[1]) {
      const prompt = match[1].trim();
      const lower = prompt.toLowerCase();
      // Filter non-image technical keywords
      if (
        lower.startsWith('pcb') ||
        lower.startsWith('operating system') ||
        lower.startsWith('code') ||
        lower.startsWith('algorithm') ||
        lower.startsWith('how to') ||
        lower.startsWith('why')
      ) {
        continue;
      }
      if (prompt.length >= 3) {
        return prompt;
      }
    }
  }

  return null;
}

/** Try to create a streaming completion, returning [stream, usedModelId] */
async function createStream(
  groq: Groq,
  modelId: string,
  formattedMessages: any[],
  temperature: number,
  maxTokens: number
): Promise<[any, string]> {
  const stream = await groq.chat.completions.create({
    model: modelId,
    messages: formattedMessages,
    temperature: Number(temperature),
    max_completion_tokens: Number(maxTokens),
    stream: true,
  });
  return [stream, modelId];
}

/** Pick the best available model for this account */
async function pickBestModel(
  groq: Groq,
  requestedModel: string
): Promise<string[]> {
  try {
    const list = await groq.models.list();
    const liveIds: string[] = list.data
      .map((m: any) => m.id)
      .filter(
        (id: string) =>
          !id.toLowerCase().includes('whisper') &&
          !id.toLowerCase().includes('guard') &&
          !id.toLowerCase().includes('embed')
      );

    // Build ordered list: preferred fallbacks first, then requested, then rest
    const ordered: string[] = [];
    for (const p of FALLBACK_PRIORITY) {
      if (liveIds.includes(p)) ordered.push(p);
    }
    if (liveIds.includes(requestedModel) && !ordered.includes(requestedModel)) {
      ordered.unshift(requestedModel);
    }
    for (const id of liveIds) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered.length > 0 ? ordered : [requestedModel];
  } catch {
    return [requestedModel, ...FALLBACK_PRIORITY];
  }
}

export async function POST(req: NextRequest) {
  const clientKey = req.headers.get('x-groq-api-key');

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    messages = [],
    model = 'qwen/qwen3.8-27b',
    temperature = 0.7,
    max_tokens = 2048,
    systemPrompt,
  } = body;

  const defaultSystemPrompt =
    'You are a helpful and knowledgeable AI assistant. Answer clearly and concisely using Markdown formatting when appropriate. Use code blocks with language tags for code. Use LaTeX ($...$ or $$...$$) for math formulas.';

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Check if user is asking to generate an image
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
  const userText =
    typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg?.content)
      ? lastUserMsg.content.find((p: any) => p.type === 'text')?.text || ''
      : '';

  const imagePrompt = detectImagePrompt(userText);

  if (imagePrompt) {
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(imagePrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;

    const responseMarkdown = `I've generated the image for you:\n\n![${imagePrompt}](${imageUrl})\n\n**Prompt:** *${imagePrompt}*`;

    const encoder = new TextEncoder();
    const customReadableStream = new ReadableStream({
      async start(controller) {
        const words = responseMarkdown.split(' ');
        for (let i = 0; i < words.length; i++) {
          const token = words[i] + (i < words.length - 1 ? ' ' : '');
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
          );
          await new Promise((r) => setTimeout(r, 20));
        }
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              stats: {
                duration: '1.20',
                tokens: words.length,
                tps: '50.0',
                model: 'Flux.1 (AI Image Generator)',
              },
            })}\n\n`
          )
        );
        controller.close();
      },
    });

    return new Response(customReadableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  try {
    const groq = getGroqClient(clientKey || body.apiKey);

    // Build formatted messages — keep system prompt short to save TPM
    const formattedMessages: any[] = [];
    const sysPromptText =
      typeof systemPrompt === 'string' && systemPrompt.trim()
        ? systemPrompt.trim().slice(0, 500) // hard cap 500 chars to save tokens
        : defaultSystemPrompt;

    formattedMessages.push({ role: 'system', content: sysPromptText });

    // Only keep last 10 messages to avoid TPM overflow
    const recentMessages = messages.slice(-10);
    for (const msg of recentMessages) {
      if (typeof msg.content === 'string') {
        formattedMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      } else if (Array.isArray(msg.content)) {
        formattedMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    const startTime = Date.now();
    let totalCompletionTokens = 0;

    // Get ordered list of models to try
    const modelQueue = await pickBestModel(groq, model);

    let stream: any = null;
    let usedModelId = model;
    let lastError: any = null;

    for (const candidateModel of modelQueue) {
      try {
        [stream, usedModelId] = await createStream(
          groq,
          candidateModel,
          formattedMessages,
          temperature,
          max_tokens
        );
        break; // success — stop trying
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err?.status === 404 ||
          err?.status === 413 ||
          err?.status === 429 ||
          err?.message?.includes('does not exist') ||
          err?.message?.includes('rate_limit') ||
          err?.message?.includes('too large') ||
          err?.code === 'model_not_found' ||
          err?.code === 'rate_limit_exceeded';

        if (isRetryable) {
          console.warn(
            `[Groq] Model ${candidateModel} failed (${err?.status}): ${err?.message}. Trying next...`
          );
          continue;
        } else {
          throw err;
        }
      }
    }

    if (!stream) {
      throw lastError || new Error('All available Groq models failed. Please try again later.');
    }

    const encoder = new TextEncoder();

    const customReadableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta as any;
            if (!delta) continue;

            const reasoningDelta = delta.reasoning || null;
            const contentDelta = delta.content || '';

            if (reasoningDelta) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ reasoning: reasoningDelta })}\n\n`
                )
              );
            }

            if (contentDelta) {
              totalCompletionTokens += Math.max(1, Math.round(contentDelta.length / 4));
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ token: contentDelta })}\n\n`
                )
              );
            }
          }

          const durationSec = (Date.now() - startTime) / 1000;
          const tokensPerSec =
            durationSec > 0
              ? (totalCompletionTokens / durationSec).toFixed(1)
              : '0';

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                stats: {
                  duration: durationSec.toFixed(2),
                  tokens: totalCompletionTokens,
                  tps: tokensPerSec,
                  model: usedModelId,
                },
              })}\n\n`
            )
          );
          controller.close();
        } catch (streamError: any) {
          console.error('[Groq] Stream error:', streamError);
          // Send a clean error through SSE so frontend can show friendly message
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: 'stream_failed',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(customReadableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Groq] Fatal error:', error);

    const friendly =
      error?.status === 429 || error?.code === 'rate_limit_exceeded'
        ? 'Rate limit reached for all available models. Please wait a moment and try again, or add a paid Groq API key in Settings.'
        : error?.message || 'Unknown error occurred while contacting Groq API.';

    return new Response(JSON.stringify({ error: friendly }), {
      status: error?.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
