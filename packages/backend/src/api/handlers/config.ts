import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { RPCContext } from '../server.js'

const ConfigUpdateSchema = z.object({
  environment: z.enum(['development', 'production', 'test']).optional(),
  database: z.object({
    host: z.string().optional(),
    port: z.coerce.number().min(1).max(65535).optional(),
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    poolSize: z.coerce.number().min(1).max(100).optional(),
    ssl: z.boolean().optional()
  }).optional(),
  scan: z.object({
    nmapPath: z.string().optional(),
    maxConcurrentScans: z.coerce.number().min(1).max(10).optional(),
    timeout: z.coerce.number().min(1000).max(300000).optional(),
    defaultPorts: z.string().optional(),
    enableServiceDetection: z.boolean().optional(),
    enableOSDetection: z.boolean().optional()
  }).optional(),
  webUI: z.object({
    port: z.coerce.number().min(1).max(65535).optional(),
    host: z.string().optional(),
    enableAuth: z.boolean().optional(),
    refreshInterval: z.coerce.number().min(1000).optional()
  }).optional(),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug', 'trace']).optional(),
    maxFileSize: z.string().optional(),
    maxFiles: z.coerce.number().min(1).optional(),
    enableConsole: z.boolean().optional()
  }).optional(),
  api: z.object({
    port: z.coerce.number().min(1).max(65535).optional(),
    host: z.string().optional(),
    enableRateLimit: z.boolean().optional(),
    rateLimitMax: z.coerce.number().min(1).optional()
  }).optional(),
  monitoring: z.object({
    enableChangeNotifications: z.boolean().optional(),
    defaultScanInterval: z.coerce.number().min(60000).optional(),
    maxSnapshotAge: z.coerce.number().min(86400).optional(),
    enableMetrics: z.boolean().optional()
  }).optional(),
  notifications: z.object({
    enableEmail: z.boolean().optional(),
    emailConfig: z.object({
      host: z.string().optional(),
      port: z.coerce.number().optional(),
      username: z.string().optional(),
      password: z.string().optional()
    }).optional(),
    enableWebhooks: z.boolean().optional(),
    webhooks: z.array(z.object({
      name: z.string(),
      url: z.string().url(),
      enabled: z.boolean()
    })).optional()
  }).optional()
}).strict()

export function createConfigHandlers(context: RPCContext) {
  const app = new Hono()

  // Get current configuration
  app.get('/', async (c) => {
    try {
      const config = await getConfig(context)
      return c.json(config)
    } catch (error) {
      console.error('Error fetching configuration:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch configuration'
      })
    }
  })

  // Update configuration
  app.put('/', async (c) => {
    try {
      const body = await c.req.json()
      const updates = ConfigUpdateSchema.parse(body)

      const updatedConfig = await updateConfig(context, updates)
      return c.json(updatedConfig)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error updating configuration:', error)
      throw new HTTPException(500, {
        message: 'Failed to update configuration'
      })
    }
  })

  // Get specific configuration section
  app.get('/:section', async (c) => {
    try {
      const section = c.req.param('section')
      const validSections = [
        'database', 'scan', 'webUI', 'logging', 
        'api', 'monitoring', 'notifications'
      ]

      if (!validSections.includes(section)) {
        throw new HTTPException(400, {
          message: `Invalid configuration section: ${section}`
        })
      }

      const config = await getConfig(context)
      const sectionConfig = config[section as keyof typeof config]

      if (!sectionConfig) {
        throw new HTTPException(404, {
          message: `Configuration section '${section}' not found`
        })
      }

      return c.json(sectionConfig)
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      
      console.error('Error fetching configuration section:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch configuration section'
      })
    }
  })

  // Update specific configuration section
  app.put('/:section', async (c) => {
    try {
      const section = c.req.param('section')
      const body = await c.req.json()

      const validSections = [
        'database', 'scan', 'webUI', 'logging', 
        'api', 'monitoring', 'notifications'
      ]

      if (!validSections.includes(section)) {
        throw new HTTPException(400, {
          message: `Invalid configuration section: ${section}`
        })
      }

      const updates = { [section]: body }
      const partialUpdates = ConfigUpdateSchema.parse(updates)

      const updatedConfig = await updateConfig(context, partialUpdates)
      return c.json(updatedConfig[section as keyof typeof updatedConfig])
    } catch (error) {
      if (error instanceof HTTPException || error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error updating configuration section:', error)
      throw new HTTPException(500, {
        message: 'Failed to update configuration section'
      })
    }
  })

  // Reset configuration to defaults
  app.post('/reset', async (c) => {
    try {
      const defaultConfig = await resetConfig(context)
      return c.json(defaultConfig)
    } catch (error) {
      console.error('Error resetting configuration:', error)
      throw new HTTPException(500, {
        message: 'Failed to reset configuration'
      })
    }
  })

  // Validate configuration
  app.post('/validate', async (c) => {
    try {
      const body = await c.req.json()
      const validation = await validateConfig(context, body)
      return c.json(validation)
    } catch (error) {
      console.error('Error validating configuration:', error)
      throw new HTTPException(500, {
        message: 'Failed to validate configuration'
      })
    }
  })

  // Export configuration
  app.get('/export', async (c) => {
    try {
      const format = c.req.query('format') || 'json'
      
      if (!['json', 'yaml', 'env'].includes(format)) {
        throw new HTTPException(400, {
          message: 'Unsupported export format. Use json, yaml, or env'
        })
      }

      const exportData = await exportConfig(context, format as 'json' | 'yaml' | 'env')
      const contentType = format === 'json' ? 'application/json' : 'text/plain'
      const filename = `nmapper-config.${format}`

      return c.body(exportData, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      
      console.error('Error exporting configuration:', error)
      throw new HTTPException(500, {
        message: 'Failed to export configuration'
      })
    }
  })

  // Import configuration
  app.post('/import', async (c) => {
    try {
      const body = await c.req.json()
      const importedConfig = await importConfig(context, body)
      return c.json(importedConfig)
    } catch (error) {
      console.error('Error importing configuration:', error)
      throw new HTTPException(500, {
        message: 'Failed to import configuration'
      })
    }
  })

  return app
}

// Handler implementations
async function getConfig(context: RPCContext) {
  // This would use the config manager to get current configuration
  // For now, return a default configuration structure
  return {
    environment: 'development',
    database: {
      host: 'localhost',
      port: 5432,
      database: 'nmapper',
      username: 'nmapper',
      password: '***',
      poolSize: 10,
      ssl: false
    },
    scan: {
      nmapPath: '/usr/bin/nmap',
      maxConcurrentScans: 3,
      timeout: 30000,
      defaultPorts: '1-1000',
      enableServiceDetection: true,
      enableOSDetection: false
    },
    webUI: {
      port: 3000,
      host: '0.0.0.0',
      enableAuth: false,
      refreshInterval: 30000
    },
    logging: {
      level: 'info',
      maxFileSize: '10MB',
      maxFiles: 5,
      enableConsole: true
    },
    api: {
      port: 3001,
      host: '0.0.0.0',
      enableRateLimit: false,
      rateLimitMax: 100
    },
    monitoring: {
      enableChangeNotifications: true,
      defaultScanInterval: 300000,
      maxSnapshotAge: 2592000,
      enableMetrics: true
    },
    notifications: {
      enableEmail: false,
      emailConfig: {
        host: '',
        port: 587,
        username: '',
        password: ''
      },
      enableWebhooks: false,
      webhooks: []
    }
  }
}

async function updateConfig(context: RPCContext, updates: any) {
  // This would use the config manager to update configuration
  // For now, merge with current config
  const currentConfig = await getConfig(context)
  const updatedConfig = deepMerge(currentConfig, updates)
  
  // Would validate and save the configuration
  console.log('Configuration updated:', Object.keys(updates))
  
  return updatedConfig
}

async function resetConfig(context: RPCContext) {
  // This would reset configuration to defaults
  return getConfig(context)
}

async function validateConfig(context: RPCContext, config: any) {
  try {
    const validatedConfig = ConfigUpdateSchema.parse(config)
    return {
      valid: true,
      errors: [],
      warnings: []
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        })),
        warnings: []
      }
    }
    
    return {
      valid: false,
      errors: [{ message: 'Unknown validation error' }],
      warnings: []
    }
  }
}

async function exportConfig(context: RPCContext, format: 'json' | 'yaml' | 'env'): Promise<string> {
  const config = await getConfig(context)
  
  switch (format) {
    case 'json':
      return JSON.stringify(config, null, 2)
    
    case 'yaml':
      // Would use a YAML library to serialize
      return '# YAML export not implemented\n' + JSON.stringify(config, null, 2)
    
    case 'env':
      // Convert to environment variables format
      const envVars: string[] = []
      const flattenObject = (obj: any, prefix: string = 'NMAPPER') => {
        Object.keys(obj).forEach(key => {
          const value = obj[key]
          const envKey = `${prefix}_${key.toUpperCase()}`
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            flattenObject(value, envKey)
          } else {
            envVars.push(`${envKey}=${value}`)
          }
        })
      }
      
      flattenObject(config)
      return envVars.join('\n')
    
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

async function importConfig(context: RPCContext, configData: any) {
  // Would validate and import configuration
  const validation = await validateConfig(context, configData)
  
  if (!validation.valid) {
    throw new HTTPException(400, {
      message: 'Invalid configuration data'
    })
  }
  
  return updateConfig(context, configData)
}

// Utility function for deep merging objects
function deepMerge(target: any, source: any): any {
  const result = { ...target }
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  
  return result
}

// RPC method implementations
export const ConfigRPCHandlers = {
  getConfig: async (params: any) => {
    // Implementation would get from context
    return {
      environment: 'development',
      database: { host: 'localhost', port: 5432 },
      scan: { nmapPath: '/usr/bin/nmap', timeout: 30000 }
      // ... other config
    }
  },
  
  updateConfig: async (params: { config: any }) => {
    if (!params.config) {
      throw new Error('Configuration data is required')
    }
    
    const updates = ConfigUpdateSchema.parse(params.config)
    // Implementation would update config
    console.log('Configuration updated via RPC')
    
    return { success: true, message: 'Configuration updated successfully' }
  }
}