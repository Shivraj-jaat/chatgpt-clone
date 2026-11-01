/**
 * Serverless-friendly Sliding Window Rate Limiter
 * Tracks requests per identifier (IP / User ID) with automated garbage collection.
 * Stateless-compatible fallback for Vercel / serverless deployments.
 */

interface RateLimitRecord {
  timestamps: number[];
}

interface RateLimitConfig {
  maxRequests: number; // Max allowed requests
  windowMs: number;    // Window size in milliseconds
}

class SlidingWindowRateLimiter {
  private cache = new Map<string, RateLimitRecord>();
  private lastCleanup = Date.now();
  private readonly cleanupInterval = 60_000; // 1 minute

  private cleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) return;
    this.lastCleanup = now;

    // Remove empty or expired records
    this.cache.forEach((record, key) => {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 300_000); // 5 min max retention
      if (record.timestamps.length === 0) {
        this.cache.delete(key);
      }
    });
  }

  public check(
    key: string,
    config: RateLimitConfig
  ): {
    allowed: boolean;
    remaining: number;
    limit: number;
    resetTime: number;
  } {
    this.cleanup();
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let record = this.cache.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.cache.set(key, record);
    }

    // Filter out timestamps older than the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    const allowed = record.timestamps.length < config.maxRequests;
    if (allowed) {
      record.timestamps.push(now);
    }

    const remaining = Math.max(0, config.maxRequests - record.timestamps.length);
    const oldest = record.timestamps[0] || now;
    const resetTime = Math.ceil((oldest + config.windowMs) / 1000);

    return {
      allowed,
      remaining,
      limit: config.maxRequests,
      resetTime,
    };
  }
}

// Global singleton instance
export const rateLimiter = new SlidingWindowRateLimiter();

/**
 * Helper to extract client IP from NextRequest headers
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return (
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    '127.0.0.1'
  );
}
