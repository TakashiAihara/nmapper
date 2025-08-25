import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { RPCContext } from '../server.js'
import type { Device, PaginatedResponse, DeviceFilters, TimeRange } from '@nmapper/shared'

const NetworkQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(1000).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['ip', 'hostname', 'lastSeen', 'deviceType']).default('ip'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

const DeviceFiltersSchema = z.object({
  isActive: z.coerce.boolean().optional(),
  hasOpenPorts: z.coerce.boolean().optional(),
  osFamily: z.string().optional(),
  vendor: z.string().optional(),
  ipRange: z.string().optional()
})

const TimeRangeSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date()
})

export function createNetworkHandlers(context: RPCContext) {
  const app = new Hono()

  // Get current network snapshot
  app.get('/current', async (c) => {
    try {
      // This would integrate with the snapshot manager
      const snapshot = await getCurrentNetworkSnapshot(context)
      
      if (!snapshot) {
        throw new HTTPException(404, {
          message: 'No current network snapshot available'
        })
      }

      return c.json(snapshot)
    } catch (error) {
      console.error('Error fetching current network:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch current network snapshot'
      })
    }
  })

  // Get network history
  app.get('/history', async (c) => {
    try {
      const query = c.req.query()
      const { limit, offset } = NetworkQuerySchema.parse(query)
      
      let timeRange: TimeRange | undefined
      if (query.start && query.end) {
        timeRange = TimeRangeSchema.parse({
          start: query.start,
          end: query.end
        })
      }

      const snapshots = await getNetworkHistory(context, {
        limit,
        offset,
        timeRange
      })

      return c.json(snapshots)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error fetching network history:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch network history'
      })
    }
  })

  // Get all devices with filtering and pagination
  app.get('/devices', async (c) => {
    try {
      const query = c.req.query()
      const { limit, offset, sortBy, sortOrder } = NetworkQuerySchema.parse(query)
      const filters = DeviceFiltersSchema.parse(query)

      const result = await getDevices(context, {
        pagination: { limit, offset },
        sorting: { sortBy, sortOrder },
        filters
      })

      return c.json(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error fetching devices:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch devices'
      })
    }
  })

  // Get specific device by IP
  app.get('/devices/:ip', async (c) => {
    try {
      const ip = c.req.param('ip')
      
      if (!isValidIP(ip)) {
        throw new HTTPException(400, {
          message: 'Invalid IP address format'
        })
      }

      const device = await getDevice(context, ip)
      
      if (!device) {
        throw new HTTPException(404, {
          message: `Device with IP ${ip} not found`
        })
      }

      return c.json(device)
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      
      console.error('Error fetching device:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch device'
      })
    }
  })

  // Get device history
  app.get('/devices/:ip/history', async (c) => {
    try {
      const ip = c.req.param('ip')
      const query = c.req.query()
      const { limit } = NetworkQuerySchema.parse(query)
      
      if (!isValidIP(ip)) {
        throw new HTTPException(400, {
          message: 'Invalid IP address format'
        })
      }

      const history = await getDeviceHistory(context, ip, limit)
      return c.json(history)
    } catch (error) {
      if (error instanceof HTTPException || error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error fetching device history:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch device history'
      })
    }
  })

  // Network topology endpoint
  app.get('/topology', async (c) => {
    try {
      const topology = await getNetworkTopology(context)
      return c.json(topology)
    } catch (error) {
      console.error('Error fetching network topology:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch network topology'
      })
    }
  })

  // Network statistics
  app.get('/stats', async (c) => {
    try {
      const stats = await getNetworkStats(context)
      return c.json(stats)
    } catch (error) {
      console.error('Error fetching network stats:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch network statistics'
      })
    }
  })

  return app
}

// Handler implementations
async function getCurrentNetworkSnapshot(context: RPCContext) {
  // This would integrate with the monitoring service's snapshot manager
  // For now, return a placeholder
  return {
    id: 'current',
    timestamp: new Date(),
    deviceCount: 0,
    totalPorts: 0,
    devices: [],
    checksum: '',
    metadata: {
      scanDuration: 0,
      scanType: 'discovery',
      errors: [],
      nmapVersion: '7.94',
      scanParameters: {}
    }
  }
}

async function getNetworkHistory(
  context: RPCContext,
  params: {
    limit: number
    offset: number
    timeRange?: TimeRange
  }
) {
  // This would integrate with the snapshot storage
  return {
    snapshots: [],
    totalCount: 0,
    hasMore: false
  }
}

async function getDevices(
  context: RPCContext,
  params: {
    pagination: { limit: number; offset: number }
    sorting: { sortBy: string; sortOrder: string }
    filters: DeviceFilters
  }
): Promise<PaginatedResponse<Device>> {
  // This would integrate with the snapshot storage to get current devices
  return {
    data: [],
    pagination: {
      page: Math.floor(params.pagination.offset / params.pagination.limit) + 1,
      limit: params.pagination.limit,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }
  }
}

async function getDevice(context: RPCContext, ip: string): Promise<Device | null> {
  // This would query the current snapshot for the specific device
  return null
}

async function getDeviceHistory(context: RPCContext, ip: string, limit: number) {
  // This would get historical data for a device across snapshots
  return []
}

async function getNetworkTopology(context: RPCContext) {
  return {
    devices: [],
    connections: [],
    subnets: []
  }
}

async function getNetworkStats(context: RPCContext) {
  const metrics = context.monitoringService.getMetrics()
  
  return {
    totalDevices: metrics.totalDevices,
    activeDevices: metrics.totalDevices, // Would need proper calculation
    totalOpenPorts: 0, // Would need calculation from current snapshot
    lastScanTime: metrics.lastScanTime ? new Date(metrics.lastScanTime) : null,
    scanFrequency: metrics.averageScanDuration,
    uptime: metrics.uptime
  }
}

// Utility functions
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

// RPC method implementations for direct RPC calls
export const NetworkRPCHandlers = {
  getCurrentNetwork: async (params: any) => {
    // Implementation would get the monitoring service from context
    return null
  },
  
  getNetworkHistory: async (params: { timeRange?: TimeRange; limit?: number }) => {
    return []
  },
  
  getDevice: async (params: { ip: string }) => {
    if (!params.ip || !isValidIP(params.ip)) {
      throw new Error('Valid IP address is required')
    }
    return null
  },
  
  getDeviceHistory: async (params: { ip: string }) => {
    if (!params.ip || !isValidIP(params.ip)) {
      throw new Error('Valid IP address is required')
    }
    return []
  }
}