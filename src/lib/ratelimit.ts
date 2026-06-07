/**
 * Simple in-memory rate limiter
 * For production, replace with Redis-based solution
 */

const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  ip: string,
  limit = 60,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const key = ip

  const existing = requests.get(key)

  if (!existing || now > existing.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  existing.count++
  return { allowed: true, remaining: limit - existing.count }
}

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of requests.entries()) {
      if (now > val.resetAt) requests.delete(key)
    }
  }, 300_000)
}
