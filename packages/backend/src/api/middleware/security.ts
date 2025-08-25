import { HTTPException } from 'hono/http-exception'
import type { Context, Next } from 'hono'
import { createHash } from 'crypto'

// Security headers middleware
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next()

    // Prevent MIME type sniffing
    c.header('X-Content-Type-Options', 'nosniff')
    
    // Prevent clickjacking
    c.header('X-Frame-Options', 'DENY')
    
    // XSS protection
    c.header('X-XSS-Protection', '1; mode=block')
    
    // Strict transport security (HTTPS only)
    if (c.req.header('x-forwarded-proto') === 'https' || c.req.url.startsWith('https:')) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    
    // Content Security Policy
    c.header('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '))
    
    // Remove server information
    c.header('Server', 'NMapper API')
  }
}

// Simple API key authentication middleware
export function apiKeyAuth(validApiKeys: string[]) {
  return async (c: Context, next: Next) => {
    const apiKey = c.req.header('x-api-key') || c.req.query('api_key')
    
    if (!apiKey) {
      throw new HTTPException(401, {
        message: 'API key is required'
      })
    }
    
    if (!validApiKeys.includes(apiKey)) {
      throw new HTTPException(403, {
        message: 'Invalid API key'
      })
    }
    
    // Store API key info in context
    c.set('apiKey', apiKey)
    await next()
  }
}

// Bearer token authentication middleware
export function bearerAuth(validateToken: (token: string) => Promise<boolean | object>) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HTTPException(401, {
        message: 'Bearer token is required'
      })
    }
    
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    try {
      const result = await validateToken(token)
      
      if (result === false) {
        throw new HTTPException(403, {
          message: 'Invalid or expired token'
        })
      }
      
      // Store token validation result in context
      c.set('auth', result === true ? { valid: true } : result)
      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      
      throw new HTTPException(403, {
        message: 'Token validation failed'
      })
    }
  }
}

// IP whitelist middleware
export function ipWhitelist(allowedIPs: string[]) {
  return async (c: Context, next: Next) => {
    const clientIP = c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
                    c.req.header('x-real-ip') ||
                    c.req.header('cf-connecting-ip') ||
                    'unknown'
    
    if (clientIP === 'unknown') {
      throw new HTTPException(400, {
        message: 'Unable to determine client IP'
      })
    }
    
    if (!allowedIPs.includes(clientIP)) {
      throw new HTTPException(403, {
        message: `Access denied for IP: ${clientIP}`
      })
    }
    
    c.set('clientIP', clientIP)
    await next()
  }
}

// Request ID middleware for tracking
export function requestId() {
  return async (c: Context, next: Next) => {
    const existingId = c.req.header('x-request-id')
    const id = existingId || generateRequestId()
    
    c.set('requestId', id)
    c.header('X-Request-ID', id)
    
    await next()
  }
}

// Request timeout middleware
export function timeout(ms: number = 30000) {
  return async (c: Context, next: Next) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new HTTPException(408, {
          message: `Request timeout after ${ms}ms`
        }))
      }, ms)
    })
    
    try {
      await Promise.race([next(), timeoutPromise])
    } catch (error) {
      throw error
    }
  }
}

// CORS with more control
export function customCors(options: {
  origins?: string[]
  methods?: string[]
  headers?: string[]
  credentials?: boolean
  maxAge?: number
}) {
  return async (c: Context, next: Next) => {
    const origin = c.req.header('origin')
    const requestMethod = c.req.header('access-control-request-method')
    const requestHeaders = c.req.header('access-control-request-headers')
    
    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      if (options.origins) {
        if (origin && options.origins.includes(origin)) {
          c.header('Access-Control-Allow-Origin', origin)
        } else if (options.origins.includes('*')) {
          c.header('Access-Control-Allow-Origin', '*')
        }
      } else {
        c.header('Access-Control-Allow-Origin', origin || '*')
      }
      
      if (options.methods) {
        c.header('Access-Control-Allow-Methods', options.methods.join(', '))
      }
      
      if (options.headers) {
        c.header('Access-Control-Allow-Headers', options.headers.join(', '))
      } else if (requestHeaders) {
        c.header('Access-Control-Allow-Headers', requestHeaders)
      }
      
      if (options.credentials) {
        c.header('Access-Control-Allow-Credentials', 'true')
      }
      
      if (options.maxAge) {
        c.header('Access-Control-Max-Age', options.maxAge.toString())
      }
      
      return c.body(null, 204)
    }
    
    // Set CORS headers for actual requests
    if (options.origins) {
      if (origin && options.origins.includes(origin)) {
        c.header('Access-Control-Allow-Origin', origin)
      } else if (options.origins.includes('*')) {
        c.header('Access-Control-Allow-Origin', '*')
      }
    } else {
      c.header('Access-Control-Allow-Origin', origin || '*')
    }
    
    if (options.credentials) {
      c.header('Access-Control-Allow-Credentials', 'true')
    }
    
    await next()
  }
}

// Generate a unique request ID
function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2)
  return `req_${timestamp}_${random}`
}

// Hash-based request signature validation
export function requestSignature(secretKey: string) {
  return async (c: Context, next: Next) => {
    const signature = c.req.header('x-signature')
    const timestamp = c.req.header('x-timestamp')
    
    if (!signature || !timestamp) {
      throw new HTTPException(401, {
        message: 'Request signature and timestamp required'
      })
    }
    
    // Check timestamp (prevent replay attacks)
    const now = Date.now()
    const requestTime = parseInt(timestamp)
    const timeDiff = Math.abs(now - requestTime)
    
    if (timeDiff > 300000) { // 5 minutes
      throw new HTTPException(401, {
        message: 'Request timestamp too old'
      })
    }
    
    // Verify signature
    const body = c.req.method !== 'GET' ? await c.req.text() : ''
    const payload = `${c.req.method}:${c.req.url}:${body}:${timestamp}`
    const expectedSignature = createHash('sha256')
      .update(payload + secretKey)
      .digest('hex')
    
    if (signature !== expectedSignature) {
      throw new HTTPException(403, {
        message: 'Invalid request signature'
      })
    }
    
    await next()
  }
}

// User agent validation (block known bots/scrapers)
export function userAgentFilter(blockedPatterns: RegExp[]) {
  return async (c: Context, next: Next) => {
    const userAgent = c.req.header('user-agent') || ''
    
    for (const pattern of blockedPatterns) {
      if (pattern.test(userAgent)) {
        throw new HTTPException(403, {
          message: 'Access denied'
        })
      }
    }
    
    await next()
  }
}

// Common blocked user agent patterns
export const BlockedUserAgents = [
  /bot/i,
  /crawler/i,
  /scraper/i,
  /spider/i,
  /curl/i,
  /wget/i
]