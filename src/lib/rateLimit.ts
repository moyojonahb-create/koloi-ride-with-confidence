/**
 * Simple in-memory rate limiter for edge functions.
 * Uses a sliding window counter pattern.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || now > entry.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return true;
  }
  return false;
}

/**
 * Creates a rate-limited version of a function.
 * Returns null if rate limited, otherwise calls the function.
 */
export function withRateLimit<T>(
  key: string,
  fn: () => Promise<T>,
  maxRequests: number = 30,
  windowMs: number = 60000
): Promise<T | null> {
  if (isRateLimited(key, maxRequests, windowMs)) {
    console.warn(`[RateLimit] ${key} exceeded ${maxRequests} requests per ${windowMs}ms`);
    return Promise.resolve(null);
  }
  return fn();
}
