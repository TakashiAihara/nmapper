import { EventEmitter } from 'events'
import type { 
  NetworkSnapshot, 
  SnapshotDiff, 
  DeviceDiff, 
  PortDiff, 
  ServiceDiff, 
  PropertyChange,
  Device,
  Port,
  Service
} from '@nmapper/shared'
import { ChangeType } from '@nmapper/shared'

export interface DiffOptions {
  includeUnchanged?: boolean
  detectPortChanges?: boolean
  detectServiceChanges?: boolean
  detectOSChanges?: boolean
  detectPropertyChanges?: boolean
  ignoreTimestamps?: boolean
  sensitivity?: 'low' | 'medium' | 'high'
}

export interface DiffStatistics {
  totalChanges: number
  devicesAdded: number
  devicesRemoved: number
  devicesChanged: number
  portsChanged: number
  servicesChanged: number
  propertiesChanged: number
  processingTime: number
}

export class SnapshotDiffer extends EventEmitter {
  constructor() {
    super()
  }

  async generateDiff(
    fromSnapshot: NetworkSnapshot,
    toSnapshot: NetworkSnapshot,
    options: DiffOptions = {}
  ): Promise<SnapshotDiff> {
    const startTime = Date.now()

    // Default options
    const opts: DiffOptions = {
      includeUnchanged: false,
      detectPortChanges: true,
      detectServiceChanges: true,
      detectOSChanges: true,
      detectPropertyChanges: true,
      ignoreTimestamps: false,
      sensitivity: 'medium',
      ...options
    }

    this.emit('diff-started', {
      fromSnapshotId: fromSnapshot.id,
      toSnapshotId: toSnapshot.id
    })

    try {
      // Create device maps for efficient lookup
      const fromDevices = new Map<string, Device>()
      const toDevices = new Map<string, Device>()

      fromSnapshot.devices.forEach(device => fromDevices.set(device.ip, device))
      toSnapshot.devices.forEach(device => toDevices.set(device.ip, device))

      // Find all unique device IPs
      const allDeviceIPs = new Set([
        ...fromDevices.keys(),
        ...toDevices.keys()
      ])

      // Generate device diffs
      const deviceChanges: DeviceDiff[] = []
      let devicesAdded = 0
      let devicesRemoved = 0
      let devicesChanged = 0

      for (const deviceIP of allDeviceIPs) {
        const fromDevice = fromDevices.get(deviceIP)
        const toDevice = toDevices.get(deviceIP)

        const deviceDiff = this.compareDevices(deviceIP, fromDevice, toDevice, opts)
        
        if (deviceDiff) {
          deviceChanges.push(deviceDiff)

          // Update counters
          switch (deviceDiff.changeType) {
            case 'device_joined':
              devicesAdded++
              break
            case 'device_left':
              devicesRemoved++
              break
            case 'device_changed':
            case 'device_inactive':
              devicesChanged++
              break
          }
        }
      }

      // Calculate port and service changes
      let portsChanged = 0
      let servicesChanged = 0

      deviceChanges.forEach(diff => {
        portsChanged += diff.portChanges?.length || 0
        servicesChanged += diff.serviceChanges?.length || 0
      })

      const summary = {
        devicesAdded,
        devicesRemoved,
        devicesChanged,
        portsChanged,
        servicesChanged,
        totalChanges: devicesAdded + devicesRemoved + devicesChanged + portsChanged + servicesChanged
      }

      const diff: SnapshotDiff = {
        fromSnapshot: fromSnapshot.id,
        toSnapshot: toSnapshot.id,
        timestamp: new Date(),
        summary,
        deviceChanges
      }

      const processingTime = Date.now() - startTime

      this.emit('diff-completed', {
        diff,
        statistics: {
          ...summary,
          propertiesChanged: deviceChanges.reduce(
            (sum, d) => sum + (d.propertyChanges?.length || 0),
            0
          ),
          processingTime
        }
      })

      console.log(`Diff generated in ${processingTime}ms: ${summary.totalChanges} total changes`)
      return diff

    } catch (error) {
      this.emit('diff-failed', {
        fromSnapshotId: fromSnapshot.id,
        toSnapshotId: toSnapshot.id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  private compareDevices(
    deviceIP: string,
    fromDevice: Device | undefined,
    toDevice: Device | undefined,
    options: DiffOptions
  ): DeviceDiff | null {
    // Device added
    if (!fromDevice && toDevice) {
      return {
        deviceIp: deviceIP,
        changeType: ChangeType.DEVICE_JOINED,
        deviceAdded: toDevice
      }
    }

    // Device removed
    if (fromDevice && !toDevice) {
      return {
        deviceIp: deviceIP,
        changeType: ChangeType.DEVICE_LEFT,
        deviceRemoved: fromDevice
      }
    }

    // Both devices exist, compare them
    if (fromDevice && toDevice) {
      const changes = this.detectDeviceChanges(fromDevice, toDevice, options)
      
      if (changes.hasChanges) {
        return {
          deviceIp: deviceIP,
          changeType: this.determineChangeType(changes),
          portChanges: changes.portChanges,
          serviceChanges: changes.serviceChanges,
          propertyChanges: changes.propertyChanges
        }
      }
    }

    return null
  }

  private detectDeviceChanges(
    fromDevice: Device,
    toDevice: Device,
    options: DiffOptions
  ) {
    const changes = {
      hasChanges: false,
      portChanges: [] as PortDiff[],
      serviceChanges: [] as ServiceDiff[],
      propertyChanges: [] as PropertyChange[]
    }

    // Detect port changes
    if (options.detectPortChanges) {
      changes.portChanges = this.compareDevicePorts(fromDevice, toDevice)
      if (changes.portChanges.length > 0) {
        changes.hasChanges = true
      }
    }

    // Detect service changes
    if (options.detectServiceChanges) {
      changes.serviceChanges = this.compareDeviceServices(fromDevice, toDevice)
      if (changes.serviceChanges.length > 0) {
        changes.hasChanges = true
      }
    }

    // Detect property changes
    if (options.detectPropertyChanges) {
      changes.propertyChanges = this.compareDeviceProperties(
        fromDevice, 
        toDevice, 
        options
      )
      if (changes.propertyChanges.length > 0) {
        changes.hasChanges = true
      }
    }

    return changes
  }

  private compareDevicePorts(fromDevice: Device, toDevice: Device): PortDiff[] {
    const fromPorts = new Map<string, Port>()
    const toPorts = new Map<string, Port>()

    // Create port maps (key: port_number/protocol)
    fromDevice.ports?.forEach(port => {
      const key = `${port.number}/${port.protocol}`
      fromPorts.set(key, port)
    })

    toDevice.ports?.forEach(port => {
      const key = `${port.number}/${port.protocol}`
      toPorts.set(key, port)
    })

    const portDiffs: PortDiff[] = []
    const allPortKeys = new Set([...fromPorts.keys(), ...toPorts.keys()])

    for (const portKey of allPortKeys) {
      const fromPort = fromPorts.get(portKey)
      const toPort = toPorts.get(portKey)

      if (!fromPort && toPort) {
        // Port added
        portDiffs.push({
          port: toPort.number,
          protocol: toPort.protocol,
          changeType: 'added',
          newState: toPort.state
        })
      } else if (fromPort && !toPort) {
        // Port removed
        portDiffs.push({
          port: fromPort.number,
          protocol: fromPort.protocol,
          changeType: 'removed',
          oldState: fromPort.state
        })
      } else if (fromPort && toPort && fromPort.state !== toPort.state) {
        // Port state changed
        portDiffs.push({
          port: fromPort.number,
          protocol: fromPort.protocol,
          changeType: 'state_changed',
          oldState: fromPort.state,
          newState: toPort.state
        })
      }
    }

    return portDiffs
  }

  private compareDeviceServices(fromDevice: Device, toDevice: Device): ServiceDiff[] {
    const fromServices = new Map<string, Service>()
    const toServices = new Map<string, Service>()

    // Create service maps (key: port/protocol/name)
    fromDevice.services?.forEach(service => {
      const key = `${service.port}/${service.protocol}/${service.name}`
      fromServices.set(key, service)
    })

    toDevice.services?.forEach(service => {
      const key = `${service.port}/${service.protocol}/${service.name}`
      toServices.set(key, service)
    })

    const serviceDiffs: ServiceDiff[] = []
    const allServiceKeys = new Set([...fromServices.keys(), ...toServices.keys()])

    for (const serviceKey of allServiceKeys) {
      const fromService = fromServices.get(serviceKey)
      const toService = toServices.get(serviceKey)

      if (!fromService && toService) {
        // Service added
        serviceDiffs.push({
          port: toService.port,
          changeType: 'added',
          newService: toService
        })
      } else if (fromService && !toService) {
        // Service removed
        serviceDiffs.push({
          port: fromService.port,
          changeType: 'removed',
          oldService: fromService
        })
      } else if (fromService && toService && fromService.version !== toService.version) {
        // Service version changed
        serviceDiffs.push({
          port: fromService.port,
          changeType: 'version_changed',
          oldService: fromService,
          newService: toService
        })
      }
    }

    return serviceDiffs
  }

  private compareDeviceProperties(
    fromDevice: Device,
    toDevice: Device,
    options: DiffOptions
  ): PropertyChange[] {
    const changes: PropertyChange[] = []

    // Compare basic properties
    const propertiesToCompare = [
      'hostname',
      'mac',
      'vendor',
      'deviceType',
      'riskLevel',
      'isActive'
    ]

    for (const property of propertiesToCompare) {
      const fromValue = fromDevice[property as keyof Device]
      const toValue = toDevice[property as keyof Device]

      if (fromValue !== toValue) {
        changes.push({
          property,
          oldValue: fromValue,
          newValue: toValue
        })
      }
    }

    // Compare OS information
    if (options.detectOSChanges) {
      const osChanges = this.compareOSInfo(fromDevice, toDevice)
      changes.push(...osChanges)
    }

    // Compare timestamps (unless ignored)
    if (!options.ignoreTimestamps) {
      if (fromDevice.lastSeen.getTime() !== toDevice.lastSeen.getTime()) {
        changes.push({
          property: 'lastSeen',
          oldValue: fromDevice.lastSeen,
          newValue: toDevice.lastSeen
        })
      }
    }

    return changes
  }

  private compareOSInfo(fromDevice: Device, toDevice: Device): PropertyChange[] {
    const changes: PropertyChange[] = []

    const fromOS = fromDevice.osInfo
    const toOS = toDevice.osInfo

    // If OS info was added or removed
    if (!fromOS && toOS) {
      changes.push({
        property: 'osInfo',
        oldValue: null,
        newValue: toOS
      })
    } else if (fromOS && !toOS) {
      changes.push({
        property: 'osInfo',
        oldValue: fromOS,
        newValue: null
      })
    } else if (fromOS && toOS) {
      // Compare OS properties
      const osProperties = ['name', 'version', 'family', 'vendor', 'type']
      
      for (const prop of osProperties) {
        const oldValue = fromOS[prop as keyof typeof fromOS]
        const newValue = toOS[prop as keyof typeof toOS]
        
        if (oldValue !== newValue) {
          changes.push({
            property: `osInfo.${prop}`,
            oldValue,
            newValue
          })
        }
      }

      // Special handling for accuracy (only report if significantly different)
      if (fromOS.accuracy !== undefined && toOS.accuracy !== undefined) {
        const accuracyDiff = Math.abs((fromOS.accuracy || 0) - (toOS.accuracy || 0))
        if (accuracyDiff >= 10) { // 10% threshold
          changes.push({
            property: 'osInfo.accuracy',
            oldValue: fromOS.accuracy,
            newValue: toOS.accuracy
          })
        }
      }
    }

    return changes
  }

  private determineChangeType(changes: {
    portChanges: PortDiff[]
    serviceChanges: ServiceDiff[]
    propertyChanges: PropertyChange[]
  }): ChangeType {
    // Check for OS changes
    const hasOSChanges = changes.propertyChanges.some(
      change => change.property.startsWith('osInfo')
    )
    if (hasOSChanges) {
      return ChangeType.OS_CHANGED
    }

    // Check for service changes
    if (changes.serviceChanges.length > 0) {
      return ChangeType.SERVICE_CHANGED
    }

    // Check for port changes
    const hasPortOpened = changes.portChanges.some(
      change => change.changeType === 'added' || 
                (change.changeType === 'state_changed' && change.newState === 'open')
    )
    if (hasPortOpened) {
      return ChangeType.PORT_OPENED
    }

    const hasPortClosed = changes.portChanges.some(
      change => change.changeType === 'removed' || 
                (change.changeType === 'state_changed' && change.newState === 'closed')
    )
    if (hasPortClosed) {
      return ChangeType.PORT_CLOSED
    }

    // Check for activity status change
    const isActiveChange = changes.propertyChanges.find(
      change => change.property === 'isActive'
    )
    if (isActiveChange && isActiveChange.newValue === false) {
      return ChangeType.DEVICE_INACTIVE
    }

    // Default to general device change
    return ChangeType.DEVICE_CHANGED
  }

  async compareManySnapshots(
    snapshots: NetworkSnapshot[],
    options: DiffOptions = {}
  ): Promise<SnapshotDiff[]> {
    if (snapshots.length < 2) {
      return []
    }

    const diffs: SnapshotDiff[] = []

    for (let i = 0; i < snapshots.length - 1; i++) {
      const fromSnapshot = snapshots[i]
      const toSnapshot = snapshots[i + 1]

      try {
        const diff = await this.generateDiff(fromSnapshot, toSnapshot, options)
        diffs.push(diff)
      } catch (error) {
        console.error(`Failed to generate diff between ${fromSnapshot.id} and ${toSnapshot.id}:`, error)
        this.emit('diff-error', {
          fromSnapshotId: fromSnapshot.id,
          toSnapshotId: toSnapshot.id,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return diffs
  }

  summarizeDiff(diff: SnapshotDiff): string {
    const { summary } = diff
    const parts: string[] = []

    if (summary.devicesAdded > 0) {
      parts.push(`${summary.devicesAdded} device${summary.devicesAdded > 1 ? 's' : ''} added`)
    }

    if (summary.devicesRemoved > 0) {
      parts.push(`${summary.devicesRemoved} device${summary.devicesRemoved > 1 ? 's' : ''} removed`)
    }

    if (summary.devicesChanged > 0) {
      parts.push(`${summary.devicesChanged} device${summary.devicesChanged > 1 ? 's' : ''} changed`)
    }

    if (summary.portsChanged > 0) {
      parts.push(`${summary.portsChanged} port change${summary.portsChanged > 1 ? 's' : ''}`)
    }

    if (summary.servicesChanged > 0) {
      parts.push(`${summary.servicesChanged} service change${summary.servicesChanged > 1 ? 's' : ''}`)
    }

    if (parts.length === 0) {
      return 'No changes detected'
    }

    return parts.join(', ')
  }

  getChangeSeverity(diff: SnapshotDiff): 'low' | 'medium' | 'high' {
    const { summary } = diff

    // High severity conditions
    if (summary.devicesAdded >= 5 || summary.devicesRemoved >= 3) {
      return 'high'
    }

    // Check for specific high-risk changes
    const hasHighRiskChanges = diff.deviceChanges.some(deviceDiff => {
      // New devices with many open ports
      if (deviceDiff.deviceAdded && deviceDiff.deviceAdded.ports) {
        const openPorts = deviceDiff.deviceAdded.ports.filter(p => p.state === 'open')
        if (openPorts.length >= 10) return true
      }

      // Port changes involving security-sensitive ports
      const securityPorts = [21, 22, 23, 80, 443, 3389, 5432, 3306]
      if (deviceDiff.portChanges) {
        const hasSecurityPortChange = deviceDiff.portChanges.some(portChange =>
          securityPorts.includes(portChange.port) && 
          portChange.changeType === 'added'
        )
        if (hasSecurityPortChange) return true
      }

      return false
    })

    if (hasHighRiskChanges) {
      return 'high'
    }

    // Medium severity conditions
    if (summary.totalChanges >= 10 || 
        summary.devicesAdded >= 2 || 
        summary.portsChanged >= 5) {
      return 'medium'
    }

    return 'low'
  }

  filterSignificantChanges(diff: SnapshotDiff): SnapshotDiff {
    // Filter out minor changes like timestamp updates
    const filteredDeviceChanges = diff.deviceChanges.map(deviceDiff => ({
      ...deviceDiff,
      propertyChanges: deviceDiff.propertyChanges?.filter(change => 
        change.property !== 'lastSeen' && 
        change.property !== 'uptimeSeconds'
      ) || []
    })).filter(deviceDiff => {
      // Keep device additions/removals
      if (deviceDiff.deviceAdded || deviceDiff.deviceRemoved) {
        return true
      }

      // Keep devices with significant changes
      return (deviceDiff.portChanges?.length || 0) > 0 ||
             (deviceDiff.serviceChanges?.length || 0) > 0 ||
             (deviceDiff.propertyChanges?.length || 0) > 0
    })

    // Recalculate summary
    const summary = {
      devicesAdded: filteredDeviceChanges.filter(d => d.deviceAdded).length,
      devicesRemoved: filteredDeviceChanges.filter(d => d.deviceRemoved).length,
      devicesChanged: filteredDeviceChanges.filter(d => !d.deviceAdded && !d.deviceRemoved).length,
      portsChanged: filteredDeviceChanges.reduce((sum, d) => sum + (d.portChanges?.length || 0), 0),
      servicesChanged: filteredDeviceChanges.reduce((sum, d) => sum + (d.serviceChanges?.length || 0), 0),
      totalChanges: 0
    }
    summary.totalChanges = summary.devicesAdded + summary.devicesRemoved + 
                          summary.devicesChanged + summary.portsChanged + summary.servicesChanged

    return {
      ...diff,
      summary,
      deviceChanges: filteredDeviceChanges
    }
  }
}