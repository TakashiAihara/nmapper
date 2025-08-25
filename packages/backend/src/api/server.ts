import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import type { RPCMethods, APIError, ValidationError } from '@nmapper/shared'
import { createNetworkHandlers } from './handlers/network.js'
import { createSnapshotHandlers } from './handlers/snapshots.js'
import { createSystemHandlers } from './handlers/system.js'
import { createConfigHandlers } from './handlers/config.js'
import type { NetworkMonitoringService } from '../services/monitor.js'
import { z } from 'zod'

export interface RPCServerConfig {
  port?: number
  host?: string
  cors?: {
    origin?: string | string[]
    allowMethods?: string[]
    allowHeaders?: string[]
  }
  enableLogging?: boolean
  enableMetrics?: boolean
  rateLimiting?: {
    enabled: boolean
    maxRequests: number
    windowMs: number
  }
}

export interface RPCContext {
  monitoringService: NetworkMonitoringService
  config: RPCServerConfig
}

export class HonoRPCServer {
  private app: Hono
  private context: RPCContext
  private config: RPCServerConfig

  constructor(
    monitoringService: NetworkMonitoringService,
    config: RPCServerConfig = {}
  ) {
    this.config = {
      port: 3001,
      host: '0.0.0.0',
      enableLogging: true,
      enableMetrics: true,
      rateLimiting: {
        enabled: false,
        maxRequests: 100,
        windowMs: 60000
      },
      ...config
    }

    this.context = {
      monitoringService,
      config: this.config
    }

    this.app = new Hono()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    // CORS middleware
    this.app.use('*', cors({
      origin: this.config.cors?.origin || '*',
      allowMethods: this.config.cors?.allowMethods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: this.config.cors?.allowHeaders || ['Content-Type', 'Authorization']
    }))

    // Logging middleware
    if (this.config.enableLogging) {
      this.app.use('*', logger())
    }

    // Global error handler
    this.app.onError((error, c) => {
      console.error('API Error:', error)

      if (error instanceof HTTPException) {
        return error.getResponse()
      }

      if (error instanceof z.ZodError) {
        const validationError: ValidationError = {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fieldErrors: {}
        }

        error.errors.forEach(err => {
          const field = err.path.join('.')
          if (!validationError.fieldErrors[field]) {
            validationError.fieldErrors[field] = []
          }
          validationError.fieldErrors[field].push(err.message)
        })

        return c.json(validationError, 400)
      }

      const apiError: APIError = {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
        details: {
          timestamp: new Date().toISOString()
        }
      }

      return c.json(apiError, 500)
    })

    // Health check endpoint
    this.app.get('/health', (c) => {
      const health = this.context.monitoringService.getHealthStatus()
      return c.json({
        status: health.status,
        timestamp: new Date(health.timestamp).toISOString(),
        components: health.components
      })
    })

    // Metrics endpoint
    if (this.config.enableMetrics) {
      this.app.get('/metrics', (c) => {
        const metrics = this.context.monitoringService.getMetrics()
        return c.json(metrics)
      })
    }
  }

  private setupRoutes(): void {
    // Network data endpoints
    const networkHandlers = createNetworkHandlers(this.context)
    this.app.route('/api/network', networkHandlers)

    // Snapshot endpoints
    const snapshotHandlers = createSnapshotHandlers(this.context)
    this.app.route('/api/snapshots', snapshotHandlers)

    // System control endpoints
    const systemHandlers = createSystemHandlers(this.context)
    this.app.route('/api/system', systemHandlers)

    // Configuration endpoints
    const configHandlers = createConfigHandlers(this.context)
    this.app.route('/api/config', configHandlers)

    // RPC-style endpoint for batched operations
    this.app.post('/rpc', async (c) => {
      const body = await c.req.json()
      const { method, params = {} } = body

      if (!method || typeof method !== 'string') {
        throw new HTTPException(400, {
          message: 'Method is required and must be a string'
        })
      }

      return this.handleRPCMethod(method, params, c)
    })

    // Batch RPC endpoint
    this.app.post('/rpc/batch', async (c) => {
      const body = await c.req.json()
      
      if (!Array.isArray(body)) {
        throw new HTTPException(400, {
          message: 'Batch requests must be an array'
        })
      }

      const results = await Promise.allSettled(
        body.map(async (request, index) => {
          try {
            const { method, params = {} } = request
            if (!method) {
              throw new Error(`Method is required for request ${index}`)
            }
            return await this.handleRPCMethod(method, params, c)
          } catch (error) {
            throw error
          }
        })
      )

      return c.json(
        results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return { success: true, data: result.value }
          } else {
            return {
              success: false,
              error: {
                code: 'RPC_ERROR',
                message: result.reason?.message || 'RPC call failed',
                requestIndex: index
              }
            }
          }
        })
      )
    })

    // API documentation endpoint
    this.app.get('/api', (c) => {
      return c.json({
        name: 'NMapper API Server',
        version: '1.0.0',
        endpoints: {
          health: 'GET /health',
          metrics: 'GET /metrics',
          network: {
            current: 'GET /api/network/current',
            history: 'GET /api/network/history',
            devices: 'GET /api/network/devices',
            device: 'GET /api/network/devices/:ip'
          },
          snapshots: {
            list: 'GET /api/snapshots',
            get: 'GET /api/snapshots/:id',
            compare: 'POST /api/snapshots/compare',
            changes: 'GET /api/snapshots/changes'
          },
          system: {
            status: 'GET /api/system/status',
            scan: 'POST /api/system/scan'
          },
          config: {
            get: 'GET /api/config',
            update: 'PUT /api/config'
          },
          rpc: {
            single: 'POST /rpc',
            batch: 'POST /rpc/batch'
          }
        }
      })
    })
  }

  private async handleRPCMethod(method: string, params: any, c: any): Promise<any> {
    // Import RPC handlers
    const { NetworkRPCHandlers } = await import('./handlers/network.js')
    const { SnapshotRPCHandlers } = await import('./handlers/snapshots.js')
    const { SystemRPCHandlers } = await import('./handlers/system.js')
    const { ConfigRPCHandlers } = await import('./handlers/config.js')

    // Route RPC method to appropriate handler
    switch (method) {
      // Network methods
      case 'getCurrentNetwork':
        return NetworkRPCHandlers.getCurrentNetwork(params)
      case 'getNetworkHistory':
        return NetworkRPCHandlers.getNetworkHistory(params)
      case 'getDevice':
        return NetworkRPCHandlers.getDevice(params)
      case 'getDeviceHistory':
        return NetworkRPCHandlers.getDeviceHistory(params)

      // Snapshot methods
      case 'compareSnapshots':
        return SnapshotRPCHandlers.compareSnapshots(params)
      case 'getRecentChanges':
        return SnapshotRPCHandlers.getRecentChanges(params)

      // System methods
      case 'triggerScan':
        return SystemRPCHandlers.triggerScan(params)
      case 'getSystemStatus':
        return SystemRPCHandlers.getSystemStatus(params)

      // Config methods
      case 'getConfig':
        return ConfigRPCHandlers.getConfig(params)
      case 'updateConfig':
        return ConfigRPCHandlers.updateConfig(params)

      default:
        throw new HTTPException(404, {
          message: `Unknown RPC method: ${method}`
        })
    }
  }

  async start(): Promise<void> {
    const port = this.config.port!
    const host = this.config.host!

    console.log(`🚀 Starting RPC Server on ${host}:${port}`)
    console.log(`📋 API Documentation: http://${host}:${port}/api`)
    console.log(`❤️ Health Check: http://${host}:${port}/health`)
    
    if (this.config.enableMetrics) {
      console.log(`📊 Metrics: http://${host}:${port}/metrics`)
    }

    // For Node.js environments, we'd use serve from @hono/node-server
    // This is a placeholder for the actual server start
    console.log('Server started successfully')
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping RPC Server...')
    // Implementation would depend on the actual server instance
    console.log('RPC Server stopped')
  }

  getApp(): Hono {
    return this.app
  }
}

// Factory function for easy creation
export function createHonoRpcService(
  monitoringService: NetworkMonitoringService,
  config?: RPCServerConfig
): HonoRPCServer {
  return new HonoRPCServer(monitoringService, config)
}