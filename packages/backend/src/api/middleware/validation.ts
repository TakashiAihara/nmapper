import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { Context, Next } from 'hono'

// Generic validation middleware factory
export function validateJSON<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()
      const validated = schema.parse(body)
      
      // Store validated data in context
      c.set('validatedData', validated)
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HTTPException(400, {
          message: 'Validation failed',
          cause: error
        })
      }
      throw error
    }
  }
}

// Query parameter validation middleware
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query()
      const validated = schema.parse(query)
      
      c.set('validatedQuery', validated)
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HTTPException(400, {
          message: 'Invalid query parameters',
          cause: error
        })
      }
      throw error
    }
  }
}

// URL parameter validation middleware
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const params = c.req.param()
      const validated = schema.parse(params)
      
      c.set('validatedParams', validated)
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HTTPException(400, {
          message: 'Invalid URL parameters',
          cause: error
        })
      }
      throw error
    }
  }
}

// Common validation schemas
export const CommonSchemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  ip: z.string().regex(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    'Invalid IP address format'
  ),
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0)
  }),
  sorting: z.object({
    sortBy: z.string().default('id'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),
  dateRange: z.object({
    start: z.coerce.date(),
    end: z.coerce.date()
  }).refine(data => data.start < data.end, {
    message: 'Start date must be before end date'
  })
}

// Request size limit middleware
export function requestSizeLimit(maxSize: number = 1024 * 1024) { // Default 1MB
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header('content-length')
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      throw new HTTPException(413, {
        message: `Request body too large. Maximum size is ${maxSize} bytes`
      })
    }
    
    await next()
  }
}

// Content type validation middleware
export function requireContentType(expectedType: string = 'application/json') {
  return async (c: Context, next: Next) => {
    const contentType = c.req.header('content-type')
    
    if (!contentType?.includes(expectedType)) {
      throw new HTTPException(415, {
        message: `Unsupported content type. Expected ${expectedType}`
      })
    }
    
    await next()
  }
}