import { z } from 'zod'
import { NetworkSnapshotSchema, DeviceDiffSchema } from './snapshot.js'
import { DeviceSchema } from './network.js'

// Time range schema
export const TimeRangeSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date()
}).refine((data) => data.start < data.end, {
  message: "Start date must be before end date"
})

// Scan result schema
export const ScanResultSchema = z.object({
  snapshotId: z.string().uuid(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  devicesFound: z.array(DeviceSchema),
  totalPorts: z.number().int().min(0),
  diff: z.object({
    fromSnapshot: z.string().uuid(),
    toSnapshot: z.string().uuid(),
    timestamp: z.coerce.date(),
    summary: z.object({
      devicesAdded: z.number().int().min(0),
      devicesRemoved: z.number().int().min(0),
      devicesChanged: z.number().int().min(0),
      portsChanged: z.number().int().min(0),
      servicesChanged: z.number().int().min(0),
      totalChanges: z.number().int().min(0)
    }),
    deviceChanges: z.array(DeviceDiffSchema)
  }).optional(),
  errors: z.array(z.string()),
  status: z.enum(['completed', 'failed', 'in_progress'])
})

// Network status schema
export const NetworkStatusSchema = z.object({
  currentSnapshot: NetworkSnapshotSchema,
  totalDevices: z.number().int().min(0),
  activeDevices: z.number().int().min(0),
  totalOpenPorts: z.number().int().min(0),
  lastScanTime: z.coerce.date(),
  recentChanges: z.array(z.object({
    fromSnapshot: z.string().uuid(),
    toSnapshot: z.string().uuid(),
    timestamp: z.coerce.date(),
    summary: z.object({
      devicesAdded: z.number().int().min(0),
      devicesRemoved: z.number().int().min(0),
      devicesChanged: z.number().int().min(0),
      portsChanged: z.number().int().min(0),
      servicesChanged: z.number().int().min(0),
      totalChanges: z.number().int().min(0)
    }),
    deviceChanges: z.array(DeviceDiffSchema)
  })),
  systemHealth: z.object({
    uptime: z.number().positive(),
    lastError: z.string().optional(),
    scanFrequency: z.number().positive()
  })
})

// System status schema
export const SystemStatusSchema = z.object({
  isScanning: z.boolean(),
  nextScanTime: z.coerce.date(),
  totalSnapshots: z.number().int().min(0),
  databaseSize: z.number().min(0),
  nmapVersion: z.string().optional(),
  uptime: z.number().positive(),
  memoryUsage: z.object({
    rss: z.number().positive(),
    heapTotal: z.number().positive(),
    heapUsed: z.number().positive(),
    external: z.number().positive(),
    arrayBuffers: z.number().positive()
  })
})

// RPC method parameter schemas
export const GetNetworkHistoryParamsSchema = z.object({
  timeRange: TimeRangeSchema.optional(),
  limit: z.number().int().positive().max(1000).optional()
})

export const GetDeviceParamsSchema = z.object({
  ip: z.string().ip()
})

export const GetDeviceHistoryParamsSchema = z.object({
  ip: z.string().ip()
})

export const CompareSnapshotsParamsSchema = z.object({
  snapshot1: z.string().uuid(),
  snapshot2: z.string().uuid()
})

export const GetRecentChangesParamsSchema = z.object({
  hours: z.number().int().positive().max(24 * 7).optional() // max 1 week
})

export const UpdateConfigParamsSchema = z.object({
  config: z.record(z.unknown()) // Will be validated against MonitorConfigSchema in the handler
})

// Error schemas
export const APIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional()
})

export const ValidationErrorSchema = APIErrorSchema.extend({
  code: z.literal('VALIDATION_ERROR'),
  fieldErrors: z.record(z.array(z.string()))
})

// Pagination schemas
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    })
  })

// Filter schemas
export const DeviceFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  hasOpenPorts: z.boolean().optional(),
  osFamily: z.string().optional(),
  vendor: z.string().optional(),
  ipRange: z.string().optional()
})

export const SnapshotFiltersSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minDevices: z.number().int().min(0).optional(),
  maxDevices: z.number().int().min(0).optional()
}).refine((data) => {
  if (data.dateFrom && data.dateTo) {
    return data.dateFrom < data.dateTo
  }
  return true
}, {
  message: "dateFrom must be before dateTo"
}).refine((data) => {
  if (data.minDevices && data.maxDevices) {
    return data.minDevices <= data.maxDevices
  }
  return true
}, {
  message: "minDevices must be less than or equal to maxDevices"
})

// Schema-inferred types (for internal use only, main types exported from types/)