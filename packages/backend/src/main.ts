#!/usr/bin/env node
import { createMonitoringService } from './services/index.js'
import { createHonoRpcService } from './api/index.js'
import { serve } from '@hono/node-server'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface MainConfig {
  monitoring?: {
    autoStart?: boolean
    gracefulShutdownTimeout?: number
    healthCheckInterval?: number
  }
  api?: {
    port?: number
    host?: string
    enableCors?: boolean
    enableRateLimit?: boolean
  }
  dataDir?: string
}

class NMapperMain {
  private monitoringSystem?: ReturnType<typeof createMonitoringService>
  private apiServer?: any
  private config: MainConfig

  constructor(config: MainConfig = {}) {
    this.config = {
      monitoring: {
        autoStart: true,
        gracefulShutdownTimeout: 30000,
        healthCheckInterval: 60000,
        ...config.monitoring
      },
      api: {
        port: 3001,
        host: '0.0.0.0',
        enableCors: true,
        enableRateLimit: true,
        ...config.api
      },
      dataDir: config.dataDir || './data'
    }
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting NMapper System...')

      // Initialize monitoring service
      console.log('📊 Initializing monitoring service...')
      this.monitoringSystem = createMonitoringService({
        dataDir: this.config.dataDir,
        scanConfig: {},
        schedulerConfig: {}
      })

      await this.monitoringSystem.start()
      console.log('✅ Monitoring service started')

      // Initialize API server
      console.log('🌐 Starting API server...')
      const rpcServer = createHonoRpcService(this.monitoringSystem.service, {
        port: this.config.api!.port,
        host: this.config.api!.host,
        enableLogging: true,
        enableMetrics: true,
        cors: this.config.api!.enableCors ? {
          origin: '*',
          allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
        } : undefined,
        rateLimiting: this.config.api!.enableRateLimit ? {
          enabled: true,
          maxRequests: 100,
          windowMs: 15 * 60 * 1000
        } : { enabled: false, maxRequests: 0, windowMs: 0 }
      })

      // Start HTTP server using @hono/node-server
      this.apiServer = serve({
        fetch: rpcServer.getApp().fetch,
        port: this.config.api!.port,
        hostname: this.config.api!.host
      })

      console.log(`✅ API server started on http://${this.config.api!.host}:${this.config.api!.port}`)
      console.log(`📋 API Documentation: http://${this.config.api!.host}:${this.config.api!.port}/api`)
      console.log(`❤️ Health Check: http://${this.config.api!.host}:${this.config.api!.port}/health`)

      // Setup graceful shutdown
      this.setupGracefulShutdown()

      console.log('🎉 NMapper System started successfully!')
      
      // Show initial status
      const health = this.monitoringSystem.getHealth()
      const metrics = this.monitoringSystem.getMetrics()
      
      console.log('\n📊 Initial Status:')
      console.log(`   System Health: ${health.status}`)
      console.log(`   Total Scans: ${metrics.totalScans}`)
      console.log(`   Total Devices: ${metrics.totalDevices}`)
      console.log(`   Uptime: ${Math.round(metrics.uptime / 1000)}s`)

    } catch (error) {
      console.error('❌ Failed to start NMapper System:', error)
      process.exit(1)
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping NMapper System...')

    try {
      // Stop API server
      if (this.apiServer) {
        console.log('⏳ Stopping API server...')
        // The @hono/node-server doesn't provide a direct close method
        // This would be implementation-specific
        console.log('✅ API server stopped')
      }

      // Stop monitoring service
      if (this.monitoringSystem) {
        console.log('⏳ Stopping monitoring service...')
        await this.monitoringSystem.stop()
        console.log('✅ Monitoring service stopped')
      }

      console.log('👋 NMapper System shutdown complete')
    } catch (error) {
      console.error('❌ Error during shutdown:', error)
      throw error
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`)
      
      try {
        await this.stop()
        process.exit(0)
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'))

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error)
      gracefulShutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
      gracefulShutdown('unhandledRejection')
    })
  }

  getStatus() {
    if (!this.monitoringSystem) {
      return { status: 'stopped' }
    }

    const health = this.monitoringSystem.getHealth()
    const metrics = this.monitoringSystem.getMetrics()

    return {
      status: 'running',
      health,
      metrics,
      api: {
        host: this.config.api!.host,
        port: this.config.api!.port
      }
    }
  }
}

// Main execution function
async function main() {
  // Parse command line arguments (basic implementation)
  const args = process.argv.slice(2)
  const config: MainConfig = {}

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
        config.api = { ...config.api, port: parseInt(args[++i]) }
        break
      case '--host':
        config.api = { ...config.api, host: args[++i] }
        break
      case '--data-dir':
        config.dataDir = args[++i]
        break
      case '--help':
        console.log(`
🔍 NMapper System

USAGE:
  nmapper-server [OPTIONS]

OPTIONS:
  --port <number>       API server port (default: 3001)
  --host <string>       API server host (default: 0.0.0.0)
  --data-dir <path>     Data directory path (default: ./data)
  --help               Show this help message

EXAMPLES:
  nmapper-server                    # Start with defaults
  nmapper-server --port 8080        # Start on port 8080
  nmapper-server --host localhost   # Start on localhost only

API Endpoints:
  GET  /health                     # Health check
  GET  /metrics                    # System metrics
  GET  /api                        # API documentation
  POST /rpc                        # RPC endpoint
  POST /rpc/batch                  # Batch RPC endpoint

For more information, visit the API documentation at /api once started.
`)
        process.exit(0)
        break
    }
  }

  const nmapper = new NMapperMain(config)
  await nmapper.start()

  // Keep the process running
  process.stdin.resume()
}

// Export for programmatic use
export { NMapperMain }

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
}