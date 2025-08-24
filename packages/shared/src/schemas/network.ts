import { z } from 'zod'

// Network device schemas
export const OSInfoSchema = z.object({
  name: z.string().optional(),
  family: z.string().optional(),
  generation: z.string().optional(),
  type: z.string().optional(),
  vendor: z.string().optional(),
  accuracy: z.number().min(0).max(100)
})

export const PortSchema = z.object({
  number: z.number().int().min(1).max(65535),
  protocol: z.enum(['tcp', 'udp']),
  state: z.enum(['open', 'closed', 'filtered']),
  service: z.string().optional(),
  version: z.string().optional(),
  product: z.string().optional()
})

export const ServiceSchema = z.object({
  port: z.number().int().min(1).max(65535),
  name: z.string().min(1),
  product: z.string().optional(),
  version: z.string().optional(),
  extraInfo: z.string().optional(),
  confidence: z.number().min(0).max(10)
})

export const DeviceSchema = z.object({
  ip: z.string().ip(),
  mac: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/),
  hostname: z.string().optional(),
  vendor: z.string().optional(),
  osInfo: OSInfoSchema.optional(),
  responseTime: z.number().positive().optional(),
  ports: z.array(PortSchema),
  services: z.array(ServiceSchema),
  lastSeen: z.coerce.date(),
  isActive: z.boolean()
})

// Network topology schemas
export const NetworkConnectionSchema = z.object({
  fromDevice: z.string().ip(),
  toDevice: z.string().ip(),
  connectionType: z.enum(['direct', 'routed']),
  latency: z.number().positive().optional()
})

export const SubnetInfoSchema = z.object({
  network: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/), // CIDR notation
  mask: z.string().ip(),
  deviceCount: z.number().int().min(0),
  activeDevices: z.number().int().min(0)
})

export const TopologyDeviceSchema = DeviceSchema.extend({
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  category: z.enum(['server', 'workstation', 'mobile', 'iot', 'network', 'unknown']),
  riskLevel: z.enum(['low', 'medium', 'high'])
})

export const NetworkTopologySchema = z.object({
  devices: z.array(TopologyDeviceSchema),
  connections: z.array(NetworkConnectionSchema),
  subnets: z.array(SubnetInfoSchema)
})

// Schema-inferred types (for internal use only, main types exported from types/)