import type { Device, Service } from './network.js'

// Network snapshot and versioning interfaces
export interface NetworkSnapshot {
  id: string
  timestamp: Date
  deviceCount: number
  totalPorts: number
  checksum: string
  devices: Device[]
  metadata: SnapshotMetadata
}

export interface SnapshotMetadata {
  scanDuration: number
  scanType: string
  errors: string[]
  nmapVersion?: string
  scanParameters?: Record<string, unknown>
}

// Change detection and diff interfaces
export interface SnapshotDiff {
  fromSnapshot: string
  toSnapshot: string
  timestamp: Date
  summary: DiffSummary
  deviceChanges: DeviceDiff[]
}

export interface DeviceDiff {
  deviceIp: string
  changeType: ChangeType
  deviceAdded?: Device
  deviceRemoved?: Device
  portChanges?: PortDiff[]
  serviceChanges?: ServiceDiff[]
  propertyChanges?: PropertyChange[]
}

export interface PortDiff {
  port: number
  protocol: string
  changeType: 'added' | 'removed' | 'state_changed'
  oldState?: string
  newState?: string
}

export interface ServiceDiff {
  port: number
  changeType: 'added' | 'removed' | 'version_changed'
  oldService?: Service
  newService?: Service
}

export interface PropertyChange {
  property: string
  oldValue: unknown
  newValue: unknown
}

export interface DiffSummary {
  devicesAdded: number
  devicesRemoved: number
  devicesChanged: number
  portsChanged: number
  servicesChanged: number
  totalChanges: number
}

export enum ChangeType {
  DEVICE_JOINED = 'device_joined',
  DEVICE_LEFT = 'device_left',
  DEVICE_CHANGED = 'device_changed',
  DEVICE_INACTIVE = 'device_inactive',
  PORT_OPENED = 'port_opened',
  PORT_CLOSED = 'port_closed',
  SERVICE_CHANGED = 'service_changed',
  OS_CHANGED = 'os_changed'
}

// Device history tracking
export interface DeviceHistoryEntry {
  timestamp: Date
  snapshotId: string
  device: Device
  changesSinceLastSeen?: DeviceDiff
}