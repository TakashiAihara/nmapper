import { z } from 'zod'

// Validation utility functions

export const validateIP = (ip: string): boolean => {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  
  return parts.every(part => {
    const num = parseInt(part, 10)
    return !isNaN(num) && num >= 0 && num <= 255
  })
}

export const validateMAC = (mac: string): boolean => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
  return macRegex.test(mac)
}

export const validatePort = (port: number): boolean => {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

export const validatePortRange = (portRange: string): boolean => {
  // Single port (e.g., "80")
  if (/^\d+$/.test(portRange)) {
    const port = parseInt(portRange, 10)
    return validatePort(port)
  }
  
  // Port range (e.g., "1-1000")
  if (/^\d+-\d+$/.test(portRange)) {
    const [start, end] = portRange.split('-').map(p => parseInt(p, 10))
    return validatePort(start) && validatePort(end) && start <= end
  }
  
  // Comma-separated ports (e.g., "22,80,443,8080")
  if (portRange.includes(',')) {
    const ports = portRange.split(',').map(p => p.trim())
    return ports.every(port => {
      if (/^\d+$/.test(port)) {
        return validatePort(parseInt(port, 10))
      }
      return false
    })
  }
  
  return false
}

export const validateNetworkRange = (range: string): boolean => {
  // CIDR notation (e.g., 192.168.1.0/24)
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
  if (cidrRegex.test(range)) {
    const [ip, prefix] = range.split('/')
    const prefixNum = parseInt(prefix, 10)
    return validateIP(ip) && prefixNum >= 0 && prefixNum <= 32
  }
  
  // Range notation (e.g., 192.168.1.1-192.168.1.254)
  const rangeRegex = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/
  if (rangeRegex.test(range)) {
    const [startIP, endIP] = range.split('-')
    return validateIP(startIP) && validateIP(endIP)
  }
  
  // Single IP
  return validateIP(range)
}

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Generic validation wrapper
export const createValidator = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } => {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, errors: result.error }
  }
}

// Validation result type
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: z.ZodError }

// Error formatting utilities
export const formatValidationErrors = (error: z.ZodError): Record<string, string[]> => {
  const fieldErrors: Record<string, string[]> = {}
  
  error.errors.forEach(err => {
    const path = err.path.join('.')
    if (!fieldErrors[path]) {
      fieldErrors[path] = []
    }
    fieldErrors[path].push(err.message)
  })
  
  return fieldErrors
}

export const getValidationErrorMessage = (error: z.ZodError): string => {
  const errors = error.errors.map(err => {
    const path = err.path.join('.')
    return path ? `${path}: ${err.message}` : err.message
  })
  
  return errors.join(', ')
}