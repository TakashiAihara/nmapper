import { z } from 'zod'
import { DeviceSchema } from './network.js'

// Snapshot metadata schema
export const SnapshotMetadataSchema = z.object({
  scanDuration: z.number().positive(),
  scanType: z.string().min(1),
  errors: z.array(z.string()),
  nmapVersion: z.string().optional(),
  scanParameters: z.record(z.unknown()).optional()
})

// Network snapshot schema
export const NetworkSnapshotSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.coerce.date(),
  deviceCount: z.number().int().min(0),
  totalPorts: z.number().int().min(0),
  checksum: z.string().min(1),
  devices: z.array(DeviceSchema),
  metadata: SnapshotMetadataSchema
})

// Change detection schemas
export const ChangeTypeSchema = z.enum([
  'device_joined',
  'device_left', 
  'device_changed',
  'device_inactive',
  'port_opened',
  'port_closed',
  'service_changed',
  'os_changed'
])

export const PropertyChangeSchema = z.object({
  property: z.string().min(1),
  oldValue: z.unknown(),
  newValue: z.unknown()
})

export const PortDiffSchema = z.object({
  port: z.number().int().min(1).max(65535),
  protocol: z.string(),
  changeType: z.enum(['added', 'removed', 'state_changed']),
  oldState: z.string().optional(),
  newState: z.string().optional()
})

export const ServiceDiffSchema = z.object({
  port: z.number().int().min(1).max(65535),
  changeType: z.enum(['added', 'removed', 'version_changed']),
  oldService: z.object({
    port: z.number(),
    name: z.string(),
    product: z.string().optional(),
    version: z.string().optional(),
    extraInfo: z.string().optional(),
    confidence: z.number()
  }).optional(),
  newService: z.object({
    port: z.number(),
    name: z.string(),
    product: z.string().optional(),
    version: z.string().optional(),
    extraInfo: z.string().optional(),
    confidence: z.number()
  }).optional()
})

export const DeviceDiffSchema = z.object({
  deviceIp: z.string().ip(),
  changeType: ChangeTypeSchema,
  deviceAdded: DeviceSchema.optional(),
  deviceRemoved: DeviceSchema.optional(),
  portChanges: z.array(PortDiffSchema).optional(),
  serviceChanges: z.array(ServiceDiffSchema).optional(),
  propertyChanges: z.array(PropertyChangeSchema).optional()
})

export const DiffSummarySchema = z.object({
  devicesAdded: z.number().int().min(0),
  devicesRemoved: z.number().int().min(0),
  devicesChanged: z.number().int().min(0),
  portsChanged: z.number().int().min(0),
  servicesChanged: z.number().int().min(0),
  totalChanges: z.number().int().min(0)
})

export const SnapshotDiffSchema = z.object({
  fromSnapshot: z.string().uuid(),
  toSnapshot: z.string().uuid(),
  timestamp: z.coerce.date(),
  summary: DiffSummarySchema,
  deviceChanges: z.array(DeviceDiffSchema)
})

// Device history schema
export const DeviceHistoryEntrySchema = z.object({
  timestamp: z.coerce.date(),
  snapshotId: z.string().uuid(),
  device: DeviceSchema,
  changesSinceLastSeen: DeviceDiffSchema.optional()
})

// Schema-inferred types (for internal use only, main types exported from types/)