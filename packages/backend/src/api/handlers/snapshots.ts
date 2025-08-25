import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { RPCContext } from '../server.js'
import type { SnapshotDiff, NetworkSnapshot, SnapshotFilters } from '@nmapper/shared'

const SnapshotQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['timestamp', 'deviceCount', 'totalPorts']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

const SnapshotFiltersSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minDevices: z.coerce.number().min(0).optional(),
  maxDevices: z.coerce.number().min(0).optional()
})

const CompareSnapshotsSchema = z.object({
  snapshot1: z.string().uuid('Invalid snapshot1 UUID'),
  snapshot2: z.string().uuid('Invalid snapshot2 UUID')
})

const RecentChangesSchema = z.object({
  hours: z.coerce.number().min(1).max(24 * 7).default(24)
})

export function createSnapshotHandlers(context: RPCContext) {
  const app = new Hono()

  // List snapshots with filtering and pagination
  app.get('/', async (c) => {
    try {
      const query = c.req.query()
      const { limit, offset, sortBy, sortOrder } = SnapshotQuerySchema.parse(query)
      const filters = SnapshotFiltersSchema.parse(query)

      const result = await listSnapshots(context, {
        pagination: { limit, offset },
        sorting: { sortBy, sortOrder },
        filters
      })

      return c.json(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error listing snapshots:', error)
      throw new HTTPException(500, {
        message: 'Failed to list snapshots'
      })
    }
  })

  // Get specific snapshot by ID
  app.get('/:id', async (c) => {
    try {
      const id = c.req.param('id')
      
      if (!isValidUUID(id)) {
        throw new HTTPException(400, {
          message: 'Invalid snapshot ID format'
        })
      }

      const snapshot = await getSnapshot(context, id)
      
      if (!snapshot) {
        throw new HTTPException(404, {
          message: `Snapshot with ID ${id} not found`
        })
      }

      return c.json(snapshot)
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      
      console.error('Error fetching snapshot:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch snapshot'
      })
    }
  })

  // Compare two snapshots
  app.post('/compare', async (c) => {
    try {
      const body = await c.req.json()
      const { snapshot1, snapshot2 } = CompareSnapshotsSchema.parse(body)

      const diff = await compareSnapshots(context, snapshot1, snapshot2)
      return c.json(diff)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error comparing snapshots:', error)
      throw new HTTPException(500, {
        message: 'Failed to compare snapshots'
      })
    }
  })

  // Get recent changes
  app.get('/changes', async (c) => {
    try {
      const query = c.req.query()
      const { hours } = RecentChangesSchema.parse(query)

      const changes = await getRecentChanges(context, hours)
      return c.json(changes)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error fetching recent changes:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch recent changes'
      })
    }
  })

  // Delete snapshot
  app.delete('/:id', async (c) => {
    try {
      const id = c.req.param('id')
      
      if (!isValidUUID(id)) {
        throw new HTTPException(400, {
          message: 'Invalid snapshot ID format'
        })
      }

      const deleted = await deleteSnapshot(context, id)
      
      if (!deleted) {
        throw new HTTPException(404, {
          message: `Snapshot with ID ${id} not found`
        })
      }

      return c.json({ 
        success: true, 
        message: `Snapshot ${id} deleted successfully` 
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      
      console.error('Error deleting snapshot:', error)
      throw new HTTPException(500, {
        message: 'Failed to delete snapshot'
      })
    }
  })

  // Get snapshot statistics
  app.get('/stats', async (c) => {
    try {
      const stats = await getSnapshotStats(context)
      return c.json(stats)
    } catch (error) {
      console.error('Error fetching snapshot stats:', error)
      throw new HTTPException(500, {
        message: 'Failed to fetch snapshot statistics'
      })
    }
  })

  // Export snapshots
  app.get('/export', async (c) => {
    try {
      const query = c.req.query()
      const format = query.format || 'json'
      const { limit } = SnapshotQuerySchema.parse(query)
      const filters = SnapshotFiltersSchema.parse(query)

      if (!['json', 'csv'].includes(format)) {
        throw new HTTPException(400, {
          message: 'Unsupported export format. Use json or csv'
        })
      }

      const exportData = await exportSnapshots(context, {
        format: format as 'json' | 'csv',
        limit,
        filters
      })

      const contentType = format === 'csv' ? 'text/csv' : 'application/json'
      const filename = `snapshots-${new Date().toISOString().split('T')[0]}.${format}`

      return c.body(exportData, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    } catch (error) {
      if (error instanceof HTTPException || error instanceof z.ZodError) {
        throw error
      }
      
      console.error('Error exporting snapshots:', error)
      throw new HTTPException(500, {
        message: 'Failed to export snapshots'
      })
    }
  })

  return app
}

// Handler implementations
async function listSnapshots(
  context: RPCContext,
  params: {
    pagination: { limit: number; offset: number }
    sorting: { sortBy: string; sortOrder: string }
    filters: SnapshotFilters
  }
) {
  // This would integrate with the snapshot storage
  return {
    snapshots: [],
    totalCount: 0,
    hasMore: false
  }
}

async function getSnapshot(context: RPCContext, id: string): Promise<NetworkSnapshot | null> {
  // This would query the snapshot storage
  return null
}

async function compareSnapshots(
  context: RPCContext,
  snapshot1Id: string,
  snapshot2Id: string
): Promise<SnapshotDiff> {
  // This would use the snapshot differ
  return {
    fromSnapshot: snapshot1Id,
    toSnapshot: snapshot2Id,
    timestamp: new Date(),
    summary: {
      devicesAdded: 0,
      devicesRemoved: 0,
      devicesChanged: 0,
      portsChanged: 0,
      servicesChanged: 0,
      totalChanges: 0
    },
    deviceChanges: []
  }
}

async function getRecentChanges(context: RPCContext, hours: number): Promise<SnapshotDiff[]> {
  // This would query recent diffs from storage
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)
  return []
}

async function deleteSnapshot(context: RPCContext, id: string): Promise<boolean> {
  // This would delete from snapshot storage
  return true
}

async function getSnapshotStats(context: RPCContext) {
  // This would aggregate snapshot statistics
  return {
    totalSnapshots: 0,
    oldestSnapshot: null,
    newestSnapshot: null,
    averageDevicesPerSnapshot: 0,
    totalStorageSize: 0,
    snapshotsByDay: [],
    deviceCountTrend: []
  }
}

async function exportSnapshots(
  context: RPCContext,
  params: {
    format: 'json' | 'csv'
    limit: number
    filters: SnapshotFilters
  }
): Promise<string> {
  const snapshots = await listSnapshots(context, {
    pagination: { limit: params.limit, offset: 0 },
    sorting: { sortBy: 'timestamp', sortOrder: 'desc' },
    filters: params.filters
  })

  if (params.format === 'json') {
    return JSON.stringify(snapshots, null, 2)
  } else {
    // CSV export
    const headers = ['ID', 'Timestamp', 'Device Count', 'Total Ports', 'Scan Duration']
    const rows: string[][] = []
    
    // Add sample data since snapshots array is empty in placeholder
    rows.push(['sample-id', new Date().toISOString(), '0', '0', '0'])
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }
}

// Utility functions
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// RPC method implementations
export const SnapshotRPCHandlers = {
  compareSnapshots: async (params: { snapshot1: string; snapshot2: string }) => {
    const { snapshot1, snapshot2 } = CompareSnapshotsSchema.parse(params)
    // Implementation would use the context
    return {
      fromSnapshot: snapshot1,
      toSnapshot: snapshot2,
      timestamp: new Date(),
      summary: {
        devicesAdded: 0,
        devicesRemoved: 0,
        devicesChanged: 0,
        portsChanged: 0,
        servicesChanged: 0,
        totalChanges: 0
      },
      deviceChanges: []
    }
  },
  
  getRecentChanges: async (params: { hours?: number }) => {
    const { hours = 24 } = params
    return []
  }
}