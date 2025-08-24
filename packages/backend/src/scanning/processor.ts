import { EventEmitter } from 'events'
import { createHash } from 'crypto'
import { ScanResult } from './scanner.js'
import { parseNmapXMLSafe } from './parser.js'
import type { Device, NetworkSnapshot, SnapshotDiff, DeviceDiff, ChangeType, Port, Service } from '@nmapper/shared'
import { DeviceSchema, NetworkSnapshotSchema } from '@nmapper/shared'
import { validateIP, validateMAC, createValidator } from '@nmapper/shared'

export interface ProcessingResult {
  snapshot: NetworkSnapshot
  isValid: boolean
  errors: string[]
  warnings: string[]
  statistics: SnapshotStatistics
}

export interface SnapshotStatistics {
  totalDevices: number
  activeDevices: number
  inactiveDevices: number
  totalPorts: number
  openPorts: number
  closedPorts: number
  filteredPorts: number
  servicesDetected: number
  osDetected: number
  newDevices: number
  changedDevices: number
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  field: string
  value: any
  message: string
  deviceIP?: string
}

export interface ProcessingOptions {
  validateDevices?: boolean
  deduplicateDevices?: boolean
  enhanceDeviceInfo?: boolean
  calculateRiskLevels?: boolean
  generateFingerprints?: boolean
}

export class ScanResultProcessor extends EventEmitter {
  private deviceValidator = createValidator(DeviceSchema)
  private snapshotValidator = createValidator(NetworkSnapshotSchema)

  constructor() {
    super()
  }

  async processScanResult(
    scanResult: ScanResult,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    this.emit('processing-started', { requestId: scanResult.requestId })

    try {
      // Default options
      const opts: ProcessingOptions = {
        validateDevices: true,
        deduplicateDevices: true,
        enhanceDeviceInfo: true,
        calculateRiskLevels: true,
        generateFingerprints: true,
        ...options
      }

      let devices = [...scanResult.devices]
      const errors: string[] = []
      const warnings: string[] = []

      // Additional parsing if XML is available but devices weren't parsed
      if (scanResult.nmapResult?.xmlOutput && devices.length === 0) {
        this.emit('processing-progress', { stage: 'parsing', progress: 10 })
        
        const parseResult = await parseNmapXMLSafe(scanResult.nmapResult.xmlOutput)
        if (parseResult.success) {
          devices = parseResult.devices
        } else {
          errors.push(...parseResult.errors)
        }
      }

      // Validate devices
      if (opts.validateDevices) {
        this.emit('processing-progress', { stage: 'validation', progress: 20 })
        
        const validationResult = this.validateDevices(devices)
        devices = validationResult.validDevices
        errors.push(...validationResult.errors)
        warnings.push(...validationResult.warnings)
      }

      // Deduplicate devices
      if (opts.deduplicateDevices) {
        this.emit('processing-progress', { stage: 'deduplication', progress: 30 })
        
        devices = this.deduplicateDevices(devices)
      }

      // Enhance device information
      if (opts.enhanceDeviceInfo) {
        this.emit('processing-progress', { stage: 'enhancement', progress: 50 })
        
        devices = await this.enhanceDeviceInfo(devices)
      }

      // Calculate risk levels
      if (opts.calculateRiskLevels) {
        this.emit('processing-progress', { stage: 'risk-analysis', progress: 70 })
        
        devices = this.calculateRiskLevels(devices)
      }

      // Generate device fingerprints
      if (opts.generateFingerprints) {
        this.emit('processing-progress', { stage: 'fingerprinting', progress: 80 })
        
        devices = this.generateDeviceFingerprints(devices)
      }

      this.emit('processing-progress', { stage: 'snapshot-creation', progress: 90 })

      // Create network snapshot
      const snapshot = this.createNetworkSnapshot(devices, scanResult)

      // Validate the final snapshot
      const snapshotValidation = this.snapshotValidator(snapshot)
      if (!snapshotValidation.success) {
        errors.push('Snapshot validation failed')
        console.error('Snapshot validation errors:', snapshotValidation.errors)
      }

      // Calculate statistics
      const statistics = this.calculateStatistics(devices)

      const result: ProcessingResult = {
        snapshot,
        isValid: errors.length === 0,
        errors,
        warnings,
        statistics
      }

      const processingTime = Date.now() - startTime
      this.emit('processing-completed', { 
        requestId: scanResult.requestId, 
        duration: processingTime,
        result 
      })

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      this.emit('processing-failed', { 
        requestId: scanResult.requestId, 
        error: errorMessage 
      })

      return {
        snapshot: this.createEmptySnapshot(scanResult),
        isValid: false,
        errors: [errorMessage],
        warnings: [],
        statistics: this.createEmptyStatistics()
      }
    }
  }

  private validateDevices(devices: Device[]): {
    validDevices: Device[]
    errors: string[]
    warnings: string[]
  } {
    const validDevices: Device[] = []
    const errors: string[] = []
    const warnings: string[] = []

    for (const device of devices) {
      const issues = this.validateDevice(device)
      const hasErrors = issues.some(issue => issue.severity === 'error')

      if (!hasErrors) {
        validDevices.push(device)
      }

      for (const issue of issues) {
        const message = `Device ${device.ip}: ${issue.message}`
        
        if (issue.severity === 'error') {
          errors.push(message)
        } else if (issue.severity === 'warning') {
          warnings.push(message)
        }
      }
    }

    return { validDevices, errors, warnings }
  }

  private validateDevice(device: Device): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Validate IP address
    if (!validateIP(device.ip)) {
      issues.push({
        severity: 'error',
        field: 'ip',
        value: device.ip,
        message: 'Invalid IP address format',
        deviceIP: device.ip
      })
    }

    // Validate MAC address if present
    if (device.mac && !validateMAC(device.mac)) {
      issues.push({
        severity: 'error',
        field: 'mac',
        value: device.mac,
        message: 'Invalid MAC address format',
        deviceIP: device.ip
      })
    }

    // Validate ports
    if (device.ports) {
      for (const port of device.ports) {
        if (port.number < 1 || port.number > 65535) {
          issues.push({
            severity: 'error',
            field: 'ports.number',
            value: port.number,
            message: `Invalid port number: ${port.number}`,
            deviceIP: device.ip
          })
        }

        if (!['tcp', 'udp'].includes(port.protocol)) {
          issues.push({
            severity: 'error',
            field: 'ports.protocol',
            value: port.protocol,
            message: `Invalid protocol: ${port.protocol}`,
            deviceIP: device.ip
          })
        }

        if (!['open', 'closed', 'filtered'].includes(port.state)) {
          issues.push({
            severity: 'error',
            field: 'ports.state',
            value: port.state,
            message: `Invalid port state: ${port.state}`,
            deviceIP: device.ip
          })
        }
      }
    }

    // Validate OS accuracy if present
    if (device.osInfo?.accuracy !== undefined) {
      if (device.osInfo.accuracy < 0 || device.osInfo.accuracy > 100) {
        issues.push({
          severity: 'warning',
          field: 'osInfo.accuracy',
          value: device.osInfo.accuracy,
          message: 'OS detection accuracy should be between 0-100',
          deviceIP: device.ip
        })
      }
    }

    // Check for missing critical information
    if (!device.hostname && !device.mac) {
      issues.push({
        severity: 'warning',
        field: 'identification',
        value: null,
        message: 'Device has no hostname or MAC address for identification',
        deviceIP: device.ip
      })
    }

    return issues
  }

  private deduplicateDevices(devices: Device[]): Device[] {
    const seen = new Map<string, Device>()

    for (const device of devices) {
      const key = device.ip // Primary key is IP address
      const existing = seen.get(key)

      if (!existing) {
        seen.set(key, device)
      } else {
        // Merge devices with the same IP, keeping the one with more information
        const merged = this.mergeDevices(existing, device)
        seen.set(key, merged)
      }
    }

    return Array.from(seen.values())
  }

  private mergeDevices(device1: Device, device2: Device): Device {
    // Prefer device with more complete information
    const score1 = this.calculateDeviceCompletenessScore(device1)
    const score2 = this.calculateDeviceCompletenessScore(device2)

    const primary = score1 >= score2 ? device1 : device2
    const secondary = score1 >= score2 ? device2 : device1

    return {
      ...primary,
      // Merge fields, preferring primary but filling gaps from secondary
      hostname: primary.hostname || secondary.hostname,
      mac: primary.mac || secondary.mac,
      vendor: primary.vendor || secondary.vendor,
      deviceType: primary.deviceType !== 'unknown' ? primary.deviceType : secondary.deviceType,
      osInfo: primary.osInfo || secondary.osInfo,
      ports: this.mergePorts(primary.ports || [], secondary.ports || []),
      services: this.mergeServices(primary.services || [], secondary.services || []),
      lastSeen: new Date(Math.max(primary.lastSeen.getTime(), secondary.lastSeen.getTime())),
      uptimeSeconds: primary.uptimeSeconds || secondary.uptimeSeconds,
      notes: [primary.notes, secondary.notes].filter(Boolean).join('; ') || undefined
    }
  }

  private calculateDeviceCompletenessScore(device: Device): number {
    let score = 0

    if (device.hostname) score += 10
    if (device.mac) score += 10
    if (device.vendor) score += 5
    if (device.deviceType !== 'unknown') score += 5
    if (device.osInfo) score += 15
    if (device.ports && device.ports.length > 0) score += 20
    if (device.services && device.services.length > 0) score += 15
    if (device.uptimeSeconds) score += 5

    return score
  }

  private mergePorts(ports1: Device['ports'], ports2: Device['ports']): Device['ports'] {
    if (!ports1 || !ports2) return ports1 || ports2

    const portMap = new Map<string, Port>()

    // Add ports from first device
    for (const port of ports1) {
      const key = `${port.number}-${port.protocol}`
      portMap.set(key, port)
    }

    // Merge ports from second device
    for (const port of ports2) {
      const key = `${port.number}-${port.protocol}`
      const existing = portMap.get(key)

      if (!existing) {
        portMap.set(key, port)
      } else {
        // Merge port information, preferring more detailed info
        portMap.set(key, {
          ...existing,
          serviceName: existing.serviceName || port.serviceName,
          serviceVersion: existing.serviceVersion || port.serviceVersion,
          banner: existing.banner || port.banner,
          confidence: Math.max(existing.confidence || 0, port.confidence || 0) || undefined
        })
      }
    }

    return Array.from(portMap.values()).sort((a, b) => a.number - b.number)
  }

  private mergeServices(services1: Device['services'], services2: Device['services']): Device['services'] {
    if (!services1 || !services2) return services1 || services2

    const serviceMap = new Map<string, Service>()

    // Add services from both devices
    for (const service of [...services1, ...services2]) {
      const key = `${service.name}-${service.port}-${service.protocol}`
      const existing = serviceMap.get(key)

      if (!existing) {
        serviceMap.set(key, service)
      } else {
        // Merge service info, preferring more detailed version
        serviceMap.set(key, {
          ...existing,
          version: existing.version || service.version
        })
      }
    }

    return Array.from(serviceMap.values())
  }

  private async enhanceDeviceInfo(devices: Device[]): Promise<Device[]> {
    return devices.map(device => ({
      ...device,
      // Add device fingerprint for identification
      fingerprint: this.generateDeviceFingerprint(device),
      
      // Enhance device type if unknown
      deviceType: device.deviceType === 'unknown' 
        ? this.inferDeviceType(device)
        : device.deviceType,
      
      // Add risk assessment
      riskLevel: this.assessDeviceRisk(device)
    }))
  }

  private calculateRiskLevels(devices: Device[]): Device[] {
    return devices.map(device => ({
      ...device,
      riskLevel: this.assessDeviceRisk(device)
    }))
  }

  private assessDeviceRisk(device: Device): 'low' | 'medium' | 'high' {
    let riskScore = 0

    // Risk factors
    const openPorts = device.ports?.filter(p => p.state === 'open') || []
    
    // High risk services
    const highRiskServices = ['telnet', 'ftp', 'rsh', 'rlogin', 'snmp']
    const hasHighRiskServices = device.services?.some(s => 
      highRiskServices.includes(s.name.toLowerCase())
    ) || false

    // Many open ports increase risk
    riskScore += Math.min(openPorts.length * 2, 20)

    // High risk services
    if (hasHighRiskServices) riskScore += 30

    // Unpatched or old OS versions
    if (device.osInfo?.name && this.isLegacyOS(device.osInfo.name)) {
      riskScore += 25
    }

    // Unknown device type
    if (device.deviceType === 'unknown') {
      riskScore += 10
    }

    // Determine risk level
    if (riskScore >= 50) return 'high'
    if (riskScore >= 25) return 'medium'
    return 'low'
  }

  private isLegacyOS(osName: string): boolean {
    const name = osName.toLowerCase()
    
    // Check for known legacy versions
    const legacyPatterns = [
      /windows xp/,
      /windows vista/,
      /windows 7/,
      /windows server 2003/,
      /windows server 2008/,
      /ubuntu 14\./,
      /ubuntu 16\./,
      /centos [5-6]/,
      /red hat.*[5-6]/
    ]

    return legacyPatterns.some(pattern => pattern.test(name))
  }

  private inferDeviceType(device: Device): string {
    const services = device.services || []
    const ports = device.ports || []

    // Server indicators
    const serverServices = ['http', 'https', 'ssh', 'ftp', 'smtp', 'mysql', 'postgresql']
    if (services.some(s => serverServices.includes(s.name.toLowerCase()))) {
      return 'server'
    }

    // Network device indicators
    const networkPorts = [22, 23, 80, 443, 161, 162] // Common network management ports
    if (ports.some(p => networkPorts.includes(p.number) && p.state === 'open')) {
      return 'network'
    }

    // IoT device indicators
    const iotServices = ['upnp', 'mdns', 'ssdp']
    if (services.some(s => iotServices.includes(s.name.toLowerCase()))) {
      return 'iot'
    }

    return 'unknown'
  }

  private generateDeviceFingerprints(devices: Device[]): Device[] {
    return devices.map(device => ({
      ...device,
      fingerprint: this.generateDeviceFingerprint(device)
    }))
  }

  private generateDeviceFingerprint(device: Device): string {
    const components = [
      device.ip,
      device.mac || '',
      device.osInfo?.name || '',
      device.services?.map(s => `${s.name}:${s.port}`).sort().join(',') || '',
      device.ports?.filter(p => p.state === 'open').map(p => `${p.number}/${p.protocol}`).sort().join(',') || ''
    ]

    return createHash('sha256').update(components.join('|')).digest('hex').substring(0, 16)
  }

  private createNetworkSnapshot(devices: Device[], scanResult: ScanResult): NetworkSnapshot {
    const totalPorts = devices.reduce((sum, device) => sum + (device.ports?.length || 0), 0)
    const checksum = this.calculateSnapshotChecksum(devices)

    return {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: scanResult.timestamp,
      deviceCount: devices.length,
      totalPorts,
      checksum,
      devices,
      metadata: {
        scanDuration: scanResult.duration,
        scanType: 'nmap',
        errors: scanResult.errors,
        nmapVersion: this.extractNmapVersion(scanResult.nmapResult?.stdout || ''),
        scanParameters: scanResult.metadata
      }
    }
  }

  private calculateSnapshotChecksum(devices: Device[]): string {
    const deviceData = devices
      .map(device => `${device.ip}:${device.fingerprint || ''}`)
      .sort()
      .join(',')

    return createHash('md5').update(deviceData).digest('hex')
  }

  private extractNmapVersion(stdout: string): string | undefined {
    const versionMatch = stdout.match(/Nmap version ([\d.]+)/)
    return versionMatch ? versionMatch[1] : undefined
  }

  private calculateStatistics(devices: Device[]): SnapshotStatistics {
    const activeDevices = devices.filter(d => d.isActive).length
    const allPorts = devices.flatMap(d => d.ports || [])
    
    return {
      totalDevices: devices.length,
      activeDevices,
      inactiveDevices: devices.length - activeDevices,
      totalPorts: allPorts.length,
      openPorts: allPorts.filter(p => p.state === 'open').length,
      closedPorts: allPorts.filter(p => p.state === 'closed').length,
      filteredPorts: allPorts.filter(p => p.state === 'filtered').length,
      servicesDetected: devices.reduce((sum, d) => sum + (d.services?.length || 0), 0),
      osDetected: devices.filter(d => d.osInfo).length,
      newDevices: 0, // Will be calculated during diff
      changedDevices: 0 // Will be calculated during diff
    }
  }

  private createEmptySnapshot(scanResult: ScanResult): NetworkSnapshot {
    return {
      id: `empty-snapshot-${Date.now()}`,
      timestamp: scanResult.timestamp,
      deviceCount: 0,
      totalPorts: 0,
      checksum: '',
      devices: [],
      metadata: {
        scanDuration: scanResult.duration,
        scanType: 'nmap',
        errors: scanResult.errors
      }
    }
  }

  private createEmptyStatistics(): SnapshotStatistics {
    return {
      totalDevices: 0,
      activeDevices: 0,
      inactiveDevices: 0,
      totalPorts: 0,
      openPorts: 0,
      closedPorts: 0,
      filteredPorts: 0,
      servicesDetected: 0,
      osDetected: 0,
      newDevices: 0,
      changedDevices: 0
    }
  }
}