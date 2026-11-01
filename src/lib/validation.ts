/**
 * Request Validation & Input Sanitization
 * Enforces strict boundaries to prevent payload denial-of-service, token abuse,
 * and malformed payloads.
 */

export interface ValidatedChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | any[];
  }>;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export function validateChatRequest(body: any): {
  valid: boolean;
  data?: ValidatedChatRequest;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object.' };
  }

  // 1. Messages Validation
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { valid: false, error: 'The `messages` array is required and must not be empty.' };
  }

  if (body.messages.length > 50) {
    return { valid: false, error: 'Message history exceeds the 50-message safety limit.' };
  }

  let totalCharCount = 0;
  const validatedMessages: ValidatedChatRequest['messages'] = [];

  for (let i = 0; i < body.messages.length; i++) {
    const msg = body.messages[i];
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: `Message at index ${i} is not a valid object.` };
    }

    const role = msg.role;
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      return { valid: false, error: `Invalid role "${role}" at message index ${i}. Must be user, assistant, or system.` };
    }

    if (typeof msg.content === 'string') {
      totalCharCount += msg.content.length;
      validatedMessages.push({ role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      // Multimodal payload
      for (const part of msg.content) {
        if (part?.type === 'text' && typeof part.text === 'string') {
          totalCharCount += part.text.length;
        }
      }
      validatedMessages.push({ role, content: msg.content });
    } else {
      return { valid: false, error: `Message content at index ${i} must be a string or array.` };
    }

    // Protect against massive prompt attacks
    if (totalCharCount > 60_000) {
      return { valid: false, error: 'Total message payload exceeds the 60,000 character safety threshold.' };
    }
  }

  // 2. Model Validation
  const rawModel = typeof body.model === 'string' ? body.model.trim() : 'qwen/qwen3.8-27b';
  // Strip dangerous characters
  const sanitizedModel = rawModel.replace(/[^a-zA-Z0-9_\-\.\/]/g, '').slice(0, 80);

  // 3. Temperature Validation (0.0 to 2.0)
  let temperature = 0.7;
  if (body.temperature !== undefined) {
    const num = Number(body.temperature);
    if (!Number.isNaN(num)) {
      temperature = Math.max(0.0, Math.min(2.0, num));
    }
  }

  // 4. Max Tokens (1 to 4096)
  let maxTokens = 2048;
  if (body.max_tokens !== undefined || body.maxTokens !== undefined) {
    const num = Number(body.max_tokens ?? body.maxTokens);
    if (!Number.isNaN(num)) {
      maxTokens = Math.max(1, Math.min(4096, Math.floor(num)));
    }
  }

  // 5. System Prompt (optional, capped at 2000 chars)
  let systemPrompt: string | undefined = undefined;
  if (typeof body.systemPrompt === 'string' && body.systemPrompt.trim()) {
    systemPrompt = body.systemPrompt.trim().slice(0, 2000);
  }

  return {
    valid: true,
    data: {
      messages: validatedMessages,
      model: sanitizedModel,
      temperature,
      maxTokens,
      systemPrompt,
    },
  };
}

