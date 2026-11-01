import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { rateLimiter, getClientIp } from '@/lib/rateLimit';
import { validateChatRequest } from '@/lib/validation';
import { getModelFallbackQueue } from '@/lib/modelCache';

function getGroqClient(clientKey?: string | null): Groq {
  const apiKey = clientKey || process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_groq_api_key')) {
    throw new Error(
      'Groq API Key is not configured. Please supply your API key in Settings or configure GROQ_API_KEY on the server.'
    );
  }
  return new Groq({ apiKey });
}

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
    /(?:can\s+you\s+)?(?:please\s+)?(?:generate|create|make|draw|paint|render|design)\s+(?:an?\s+)?(?:image|picture|photo|painting|illustration|artwork|wallpaper)\s+(?:of|showing|depicting|with)?\s+(.+)/i,
    /(?:can\s+you\s+)?(?:please\s+)?(?:show\s+me)\s+(?:an?\s+)?(?:image|picture|photo)\s+(?:of|showing)?\s+(.+)/i,
    /^(?:image|picture|photo|illustration|drawing)\s+of\s+(.+)/i,
    /(?:photo|image|picture)\s+(?:banao|generate\s+karo|create\s+karo)\s*(?:of)?\s*(.+)/i,
    /(.+?)\s+(?:ki\s+)?(?:photo|image|picture)\s+(?:banao|dikhao|generate\s+karo)/i,
  ];

  for (const regex of regexPatterns) {
    const match = t.match(regex);
    if (match && match[1]) {
      const prompt = match[1].trim();
      const lower = prompt.toLowerCase();
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

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientKey = req.headers.get('x-groq-api-key');
  const clientIp = getClientIp(req.headers);

  // Rate Limiting Enforcement:
  // - If client provides their own Groq key, grant higher quota (60 req/min)
  // - If using shared server key, enforce strict protection (15 req/min) to prevent quota exhaustion
  const isCustomKey = Boolean(clientKey && clientKey.trim());
  const rateLimitConfig = isCustomKey
    ? { maxRequests: 60, windowMs: 60_000 }
    : { maxRequests: 15, windowMs: 60_000 };

  const rateCheck = rateLimiter.check(`chat_${clientIp}_${isCustomKey ? 'custom' : 'shared'}`, rateLimitConfig);

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
          ? 'Rate limit exceeded for custom API key. Please slow down.'
          : 'Server rate limit exceeded. To bypass shared limits, add your personal free Groq API key in Settings.',
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

  // Parse and validate incoming payload
  let rawBody: any;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request payload.', code: 'INVALID_JSON', requestId },
      { status: 400, headers: rateHeaders }
    );
  }

  const validation = validateChatRequest(rawBody);
  if (!validation.valid || !validation.data) {
    return NextResponse.json(
      { error: validation.error || 'Invalid request body.', code: 'VALIDATION_ERROR', requestId },
      { status: 400, headers: rateHeaders }
    );
  }

  const { messages, model, temperature, maxTokens, systemPrompt } = validation.data;

  // 1. Check if user is asking to generate an AI image
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
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
          if (req.signal.aborted) {
            controller.close();
            return;
          }
          const token = words[i] + (i < words.length - 1 ? ' ' : '');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
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
        ...rateHeaders,
      },
    });
  }

  // 2. Groq AI Streaming Completion
  try {
    const groq = getGroqClient(clientKey || rawBody.apiKey);

    const defaultSystemPrompt =
      'You are a helpful and knowledgeable AI assistant. Answer clearly and concisely using Markdown formatting when appropriate. Use code blocks with language tags for code. Use LaTeX ($...$ or $$...$$) for math formulas.';

    const formattedMessages: any[] = [];
    const sysPromptText = systemPrompt || defaultSystemPrompt;
    formattedMessages.push({ role: 'system', content: sysPromptText });

    // Limit conversation history to the last 10 messages to avoid TPM overflow
    const recentMessages = messages.slice(-10);
    for (const msg of recentMessages) {
      formattedMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    const startTime = Date.now();
    let totalCompletionTokens = 0;

    // Retrieve cached model fallback queue (eliminates redundant groq.models.list() calls!)
    const modelQueue = await getModelFallbackQueue(groq, model);

    let stream: any = null;
    let usedModelId = model;
    let lastError: any = null;

    for (const candidateModel of modelQueue) {
      if (req.signal.aborted) {
        return new Response(null, { status: 499 }); // Client Closed Request
      }

      try {
        [stream, usedModelId] = await createStream(
          groq,
          candidateModel,
          formattedMessages,
          temperature,
          maxTokens
        );
        break; // Successfully established stream
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
            `[Groq] Model ${candidateModel} fallback triggered (${err?.status}): ${err?.message}`
          );
          continue;
        } else {
          throw err;
        }
      }
    }

    if (!stream) {
      throw lastError || new Error('All candidate Groq models failed. Please try again later.');
    }

    const encoder = new TextEncoder();

    const customReadableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Check if client disconnected or aborted request
            if (req.signal.aborted) {
              controller.close();
              return;
            }

            const delta = chunk.choices[0]?.delta as any;
            if (!delta) continue;

            const reasoningDelta = delta.reasoning || null;
            const contentDelta = delta.content || '';

            if (reasoningDelta) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ reasoning: reasoningDelta })}\n\n`)
              );
            }

            if (contentDelta) {
              totalCompletionTokens += Math.max(1, Math.round(contentDelta.length / 4));
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token: contentDelta })}\n\n`)
              );
            }
          }

          const durationSec = (Date.now() - startTime) / 1000;
          const tokensPerSec =
            durationSec > 0 ? (totalCompletionTokens / durationSec).toFixed(1) : '0';

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
          if (!req.signal.aborted) {
            console.error('[Groq] Stream transmission error:', streamError?.message);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  error: 'stream_failed',
                  message: 'Stream interrupted unexpectedly.',
                })}\n\n`
              )
            );
          }
          controller.close();
        }
      },
    });

    return new Response(customReadableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        ...rateHeaders,
      },
    });
  } catch (error: any) {
    console.error(`[Groq API Error] [Request: ${requestId}]`, error?.message);

    const isRateLimit = error?.status === 429 || error?.code === 'rate_limit_exceeded';
    const friendly = isRateLimit
      ? 'Rate limit reached on AI provider. Please wait a moment or configure a personal Groq API key in Settings.'
      : error?.message || 'An unexpected error occurred while communicating with Groq.';

    return NextResponse.json(
      { error: friendly, code: error?.code || 'GROQ_API_ERROR', requestId },
      { status: error?.status || 500, headers: rateHeaders }
    );
  }
}
