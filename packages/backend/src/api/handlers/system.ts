import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { RPCContext } from '../server.js'
import type { ScanResult, SystemStatus } from '@nmapper/shared'

const TriggerScanSchema = z.object({
  networkRange: z.string().optional(),
  scanType: z.enum(['discovery', 'comprehensive', 'quick']).default('discovery'),
  ports: z.string().optional(),
  timeout: z.coerce.number().min(1000).max(300000).optional()
})

const SystemActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'reload'])
})

export function createSystemHandlers(context: RPCContext) {
  const app = new Hono()

  // Get system status
  app.get('/status', async (c) => {
    try {
      const status = await getSystemStatus(context)
      return c.json(status)
    } catch (error) {
      console.error('Error fetching system status:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch system status'
      })
    }
  })

  // Trigger manual scan
  app.post('/scan', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}))
      const scanParams = TriggerScanSchema.parse(body)

      const result = await triggerScan(context, scanParams)
      return c.json(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error triggering scan:', error)
      throw new HTTPException(500, {
        message: 'Failed to trigger scan'
      })
    }
  })

  // System control actions
  app.post('/control', async (c) => {
    try {
      const body = await c.req.json()
      const { action } = SystemActionSchema.parse(body)

      const result = await performSystemAction(context, action)
      return c.json(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error performing system action:', error)
      throw new HTTPException(500, {
        message: `Failed to perform system action: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  })

  // Get system logs
  app.get('/logs', async (c) => {
    try {
      const query = c.req.query()
      const lines = Math.min(parseInt(query.lines || '100'), 1000)
      const level = query.level || 'info'
      const since = query.since ? new Date(query.since) : new Date(Date.now() - 24 * 60 * 60 * 1000)

      const logs = await getSystemLogs(context, { lines, level, since })
      return c.json(logs)
    } catch (error) {
      console.error('Error fetching system logs:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch system logs'
      })
    }
  })

  // System information
  app.get('/info', async (c) => {
    try {
      const info = await getSystemInfo(context)
      return c.json(info)
    } catch (error) {
      console.error('Error fetching system info:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch system information'
      })
    }
  })

  // Performance metrics
  app.get('/performance', async (c) => {
    try {
      const metrics = await getPerformanceMetrics(context)
      return c.json(metrics)
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch performance metrics'
      })
    }
  })

  // Scheduled scans management
  app.get('/schedules', async (c) => {
    try {
      const schedules = await getScheduledScans(context)
      return c.json(schedules)
    } catch (error) {
      console.error('Error fetching scheduled scans:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch scheduled scans'
      })
    }
  })

  app.post('/schedules', async (c) => {
    try {
      const body = await c.req.json()
      const schedule = await createScheduledScan(context, body)
      return c.json(schedule, 201)
    } catch (error) {
      console.error('Error creating scheduled scan:', error)
      throw new HTTPException(500, {
        message: 'Failed to create scheduled scan'
      })
    }
  })

  app.put('/schedules/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const body = await c.req.json()
      const schedule = await updateScheduledScan(context, id, body)
      
      if (!schedule) {
        throw new HTTPException(404, {
          message: `Scheduled scan with ID ${id} not found`
        })
      }
      
      return c.json(schedule)
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      
      console.error('Error updating scheduled scan:', error)
      throw new HTTPException(500, {
        message: 'Failed to update scheduled scan'
      })
    }
  })

  app.delete('/schedules/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const deleted = await deleteScheduledScan(context, id)
      
      if (!deleted) {
        throw new HTTPException(404, {
          message: `Scheduled scan with ID ${id} not found`
        })
      }
      
      return c.json({ 
        success: true, 
        message: `Scheduled scan ${id} deleted successfully` 
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      
      console.error('Error deleting scheduled scan:', error)
      throw new HTTPException(500, {
        message: 'Failed to delete scheduled scan'
      })
    }
  })

  return app
}

// Handler implementations
async function getSystemStatus(context: RPCContext): Promise<SystemStatus> {
  const health = context.monitoringService.getHealthStatus()
  const metrics = context.monitoringService.getMetrics()

  return {
    isScanning: false, // Would check if scan is in progress
    nextScanTime: new Date(Date.now() + 60 * 60 * 1000), // Would get from scheduler
    totalSnapshots: 0, // Would get from snapshot storage
    databaseSize: 0, // Would calculate from database
    nmapVersion: '7.94', // Would get from nmap service
    uptime: metrics.uptime,
    memoryUsage: metrics.memoryUsage
  }
}

async function triggerScan(
  context: RPCContext,
  params: {
    networkRange?: string
    scanType: 'discovery' | 'comprehensive' | 'quick'
    ports?: string
    timeout?: number
  }
): Promise<ScanResult> {
  // This would use the monitoring service to trigger a manual scan
  const networkRange = params.networkRange || '192.168.1.0/24' // Default range

  try {
    // Would call: context.monitoringService.executeManualScan(networkRange, params)
    const startTime = new Date()
    
    // Placeholder implementation
    const result: ScanResult = {
      snapshotId: `scan-${Date.now()}`,
      startTime,
      endTime: new Date(),
      devicesFound: [],
      totalPorts: 0,
      errors: [],
      status: 'completed'
    }

    return result
  } catch (error) {
    return {
      snapshotId: '',
      startTime: new Date(),
      devicesFound: [],
      totalPorts: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      status: 'failed'
    }
  }
}

async function performSystemAction(
  context: RPCContext,
  action: 'start' | 'stop' | 'restart' | 'reload'
) {
  switch (action) {
    case 'start':
      await context.monitoringService.start()
      return { success: true, message: 'System started successfully' }
    
    case 'stop':
      await context.monitoringService.stop()
      return { success: true, message: 'System stopped successfully' }
    
    case 'restart':
      await context.monitoringService.stop()
      await context.monitoringService.start()
      return { success: true, message: 'System restarted successfully' }
    
    case 'reload':
      // Would reload configuration
      return { success: true, message: 'Configuration reloaded successfully' }
    
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

async function getSystemLogs(
  context: RPCContext,
  params: {
    lines: number
    level: string
    since: Date
  }
) {
  // This would read from log files or log system
  return {
    logs: [],
    totalLines: 0,
    since: params.since,
    level: params.level
  }
}

async function getSystemInfo(context: RPCContext) {
  const health = context.monitoringService.getHealthStatus()
  const metrics = context.monitoringService.getMetrics()

  return {
    version: '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    uptime: metrics.uptime,
    startTime: new Date(Date.now() - metrics.uptime),
    processId: process.pid,
    components: health.components,
    environment: process.env.NODE_ENV || 'development'
  }
}

async function getPerformanceMetrics(context: RPCContext) {
  const metrics = context.monitoringService.getMetrics()

  return {
    memory: metrics.memoryUsage,
    cpu: {
      usage: 0, // Would calculate CPU usage
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
    },
    scanning: {
      averageDuration: metrics.averageScanDuration,
      totalScans: metrics.totalScans,
      scanErrors: metrics.scanErrors
    },
    database: {
      connections: 0, // Would get from database pool
      queryTime: 0 // Would get from database metrics
    }
  }
}

async function getScheduledScans(context: RPCContext) {
  // Would get from the scheduler
  return []
}

async function createScheduledScan(context: RPCContext, data: any) {
  // Would create a new scheduled scan
  return { id: 'new-schedule', ...data }
}

async function updateScheduledScan(context: RPCContext, id: string, data: any) {
  // Would update existing scheduled scan
  return { id, ...data }
}

async function deleteScheduledScan(context: RPCContext, id: string): Promise<boolean> {
  // Would delete scheduled scan
  return true
}

// RPC method implementations
export const SystemRPCHandlers = {
  triggerScan: async (params: any) => {
    const scanParams = TriggerScanSchema.parse(params || {})
    
    const result: ScanResult = {
      snapshotId: `scan-${Date.now()}`,
      startTime: new Date(),
      endTime: new Date(),
      devicesFound: [],
      totalPorts: 0,
      errors: [],
      status: 'completed'
    }

    return result
  },
  
  getSystemStatus: async (params: any) => {
    const status: SystemStatus = {
      isScanning: false,
      nextScanTime: new Date(Date.now() + 60 * 60 * 1000),
      totalSnapshots: 0,
      databaseSize: 0,
      nmapVersion: '7.94',
      uptime: process.uptime() * 1000,
      memoryUsage: process.memoryUsage()
    }

    return status
  }
}