import { HTTPException } from 'hono/http-exception'
import type { Context, Next } from 'hono'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (c: Context) => string
  onLimitReached?: (c: Context) => void
}

class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>()
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (c) => this.getClientIP(c),
      onLimitReached: () => {},
      ...config
    }
  }

  private getClientIP(c: Context): string {
    return c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
           c.req.header('x-real-ip') ||
           c.req.header('cf-connecting-ip') ||
           c.env?.ip ||
           'unknown'
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now()
    for (const [key, data] of this.requests.entries()) {
      if (data.resetTime <= now) {
        this.requests.delete(key)
      }
    }
  }

  middleware() {
    return async (c: Context, next: Next) => {
      this.cleanupExpiredEntries()

      const key = this.config.keyGenerator(c)
      const now = Date.now()
      
      let requestData = this.requests.get(key)
      
      if (!requestData || requestData.resetTime <= now) {
        requestData = {
          count: 0,
          resetTime: now + this.config.windowMs
        }
        this.requests.set(key, requestData)
      }

      // Check if limit exceeded
      if (requestData.count >= this.config.maxRequests) {
        this.config.onLimitReached(c)
        
        throw new HTTPException(429, {
          message: 'Too many requests',
          res: new Response('Too Many Requests', {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((requestData.resetTime - now) / 1000).toString(),
              'X-RateLimit-Limit': this.config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': requestData.resetTime.toString()
            }
          })
        })
      }

      // Increment counter
      requestData.count++

      // Add rate limit headers
      c.header('X-RateLimit-Limit', this.config.maxRequests.toString())
      c.header('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - requestData.count).toString())
      c.header('X-RateLimit-Reset', requestData.resetTime.toString())

      await next()

      // Optionally skip counting successful/failed requests
      const statusCode = c.res.status
      const shouldSkip = 
        (this.config.skipSuccessfulRequests && statusCode < 400) ||
        (this.config.skipFailedRequests && statusCode >= 400)

      if (shouldSkip) {
        requestData.count--
      }
    }
  }

  // Get current stats for a key
  getStats(key?: string): { count: number; remaining: number; resetTime: number } | null {
    const targetKey = key || 'default'
    const data = this.requests.get(targetKey)
    
    if (!data) return null

    return {
      count: data.count,
      remaining: Math.max(0, this.config.maxRequests - data.count),
      resetTime: data.resetTime
    }
  }

  // Reset limits for a specific key
  reset(key: string): boolean {
    return this.requests.delete(key)
  }

  // Get all active keys
  getActiveKeys(): string[] {
    this.cleanupExpiredEntries()
    return Array.from(this.requests.keys())
  }
}

// Factory function for creating rate limit middleware
export function rateLimit(config: RateLimitConfig) {
  const limiter = new RateLimiter(config)
  return limiter.middleware()
}

// Preset configurations
export const RateLimitPresets = {
  // Very strict - for authentication endpoints
  strict: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  },
  
  // Normal API usage
  moderate: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000 // 15 minutes
  },
  
  // Lenient - for public endpoints
  lenient: {
    maxRequests: 1000,
    windowMs: 15 * 60 * 1000 // 15 minutes
  },
  
  // Per-second limits for real-time endpoints
  perSecond: {
    maxRequests: 10,
    windowMs: 1000 // 1 second
  }
}

// Sliding window rate limiter (more accurate but uses more memory)
export class SlidingWindowRateLimiter {
  private windows = new Map<string, number[]>()
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (c) => this.getClientIP(c),
      onLimitReached: () => {},
      ...config
    }
  }

  private getClientIP(c: Context): string {
    return c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
           c.req.header('x-real-ip') ||
           'unknown'
  }

  middleware() {
    return async (c: Context, next: Next) => {
      const key = this.config.keyGenerator(c)
      const now = Date.now()
      const windowStart = now - this.config.windowMs

      // Get or create window for this key
      let window = this.windows.get(key) || []
      
      // Remove expired entries
      window = window.filter(timestamp => timestamp > windowStart)
      
      // Check if limit would be exceeded
      if (window.length >= this.config.maxRequests) {
        this.config.onLimitReached(c)
        
        const oldestRequest = Math.min(...window)
        const retryAfter = Math.ceil((oldestRequest + this.config.windowMs - now) / 1000)
        
        throw new HTTPException(429, {
          message: 'Too many requests',
          res: new Response('Too Many Requests', {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': this.config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0'
            }
          })
        })
      }

      // Add current request to window
      window.push(now)
      this.windows.set(key, window)

      // Add rate limit headers
      c.header('X-RateLimit-Limit', this.config.maxRequests.toString())
      c.header('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - window.length).toString())

      await next()

      // Handle skip logic after response
      const statusCode = c.res.status
      const shouldSkip = 
        (this.config.skipSuccessfulRequests && statusCode < 400) ||
        (this.config.skipFailedRequests && statusCode >= 400)

      if (shouldSkip) {
        window.pop() // Remove the last added request
        this.windows.set(key, window)
      }
    }
  }
}

export function slidingWindowRateLimit(config: RateLimitConfig) {
  const limiter = new SlidingWindowRateLimiter(config)
  return limiter.middleware()
}