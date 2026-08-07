interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

// In-memory store: fine for a single-instance dev/hobby deployment with no
// auth or database. Resets on restart and doesn't share state across
// instances — swap for a shared store (e.g. Redis) if this ever runs
// multi-instance.
const requestLog = new Map<string, RateLimitEntry>();

function pruneExpired(now: number) {
  for (const [key, entry] of requestLog) {
    if (entry.resetAt <= now) {
      requestLog.delete(key);
    }
  }
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const entry = requestLog.get(identifier);

  if (!entry || entry.resetAt <= now) {
    if (requestLog.size > 1000) {
      pruneExpired(now);
    }
    requestLog.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIdentifier(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
