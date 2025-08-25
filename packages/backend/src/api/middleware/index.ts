export * from './validation.js'
export * from './rateLimit.js'
export * from './security.js'

// Re-export commonly used middleware
export {
  validateJSON,
  validateQuery,
  validateParams,
  CommonSchemas,
  requestSizeLimit,
  requireContentType
} from './validation.js'

export {
  rateLimit,
  slidingWindowRateLimit,
  RateLimitPresets
} from './rateLimit.js'

export {
  securityHeaders,
  apiKeyAuth,
  bearerAuth,
  ipWhitelist,
  requestId,
  timeout,
  customCors,
  requestSignature,
  userAgentFilter,
  BlockedUserAgents
} from './security.js'

import { 
  securityHeaders as secHeaders,
  requestId as reqId,
  apiKeyAuth as apiAuth,
  userAgentFilter as uaFilter,
  BlockedUserAgents as blockedUAs
} from './security.js'
import { rateLimit as rlimit } from './rateLimit.js'

// Middleware presets for common use cases
export const MiddlewarePresets = {
  // Basic security and validation
  basic: () => [
    secHeaders(),
    reqId()
  ],
  
  // API with rate limiting
  api: (rateLimitConfig?: any) => [
    secHeaders(),
    reqId(),
    rlimit(rateLimitConfig || { maxRequests: 100, windowMs: 15 * 60 * 1000 })
  ],
  
  // Secure API with authentication
  secure: (apiKeys: string[], rateLimitConfig?: any) => [
    secHeaders(),
    reqId(),
    apiAuth(apiKeys),
    rlimit(rateLimitConfig || { maxRequests: 100, windowMs: 15 * 60 * 1000 })
  ],
  
  // Public endpoint with light protection
  public: () => [
    secHeaders(),
    reqId(),
    rlimit({ maxRequests: 1000, windowMs: 15 * 60 * 1000 }),
    uaFilter(blockedUAs)
  ]
}