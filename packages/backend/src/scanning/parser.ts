import { parseStringPromise } from 'xml2js'
import type { Device, Port, OSInfo } from '@nmapper/shared'
import { COMMON_SERVICES, WELL_KNOWN_PORTS, PORT_STATES } from '@nmapper/shared'

export interface NmapXMLRoot {
  nmaprun: {
    $: {
      scanner: string
      args: string
      start: string
      startstr: string
      version: string
      xmloutputversion: string
    }
    scaninfo?: {
      $: {
        type: string
        protocol: string
        numservices: string
        services: string
      }
    }[]
    host?: NmapHost[]
    runstats?: {
      finished: {
        $: {
          time: string
          timestr: string
          elapsed: string
          summary: string
          exit: string
        }
      }[]
    }[]
  }
}

export interface NmapHost {
  $?: {
    starttime?: string
    endtime?: string
  }
  status?: {
    $: {
      state: string
      reason: string
      reason_ttl?: string
    }
  }[]
  address?: {
    $: {
      addr: string
      addrtype: string
      vendor?: string
    }
  }[]
  hostnames?: {
    hostname?: {
      $: {
        name: string
        type: string
      }
    }[]
  }[]
  ports?: {
    extraports?: {
      $: {
        state: string
        count: string
      }
    }[]
    port?: NmapPort[]
  }[]
  os?: {
    portused?: {
      $: {
        state: string
        proto: string
        portid: string
      }
    }[]
    osmatch?: {
      $: {
        name: string
        accuracy: string
        line?: string
      }
      osclass?: {
        $: {
          type?: string
          vendor?: string
          osfamily?: string
          osgen?: string
          accuracy: string
        }
      }[]
    }[]
    osfingerprint?: {
      $: {
        fingerprint: string
      }
    }[]
  }[]
  uptime?: {
    $: {
      seconds: string
      lastboot?: string
    }
  }[]
  tcpsequence?: {
    $: {
      index: string
      difficulty: string
      values: string
    }
  }[]
  times?: {
    $: {
      srtt: string
      rttvar: string
      to: string
    }
  }[]
}

export interface NmapPort {
  $: {
    protocol: string
    portid: string
  }
  state: {
    $: {
      state: string
      reason: string
      reason_ttl?: string
    }
  }[]
  service?: {
    $: {
      name?: string
      product?: string
      version?: string
      extrainfo?: string
      method?: string
      conf?: string
      tunnel?: string
    }
  }[]
  script?: {
    $: {
      id: string
      output: string
    }
  }[]
}

export async function parseNmapXML(xmlContent: string): Promise<Device[]> {
  try {
    const result = await parseStringPromise(xmlContent, {
      explicitArray: true,
      mergeAttrs: false,
      normalize: true,
      normalizeTags: true,
      trim: true
    }) as NmapXMLRoot

    if (!result?.nmaprun?.host) {
      return []
    }

    const devices: Device[] = []

    for (const host of result.nmaprun.host) {
      const device = parseHost(host)
      if (device) {
        devices.push(device)
      }
    }

    return devices
  } catch (error) {
    console.error('Failed to parse nmap XML:', error)
    throw new Error(`XML parsing failed: ${error}`)
  }
}

function parseHost(host: NmapHost): Device | null {
  // Check if host is up
  const status = host.status?.[0]?.$
  if (!status || status.state !== 'up') {
    return null
  }

  // Get IP address and MAC
  const addresses = host.address || []
  const ipAddress = addresses.find(addr => addr.$.addrtype === 'ipv4')
  const macAddress = addresses.find(addr => addr.$.addrtype === 'mac')

  if (!ipAddress) {
    return null // Skip hosts without IP address
  }

  // Get hostname
  let hostname: string | undefined
  const hostnames = host.hostnames?.[0]?.hostname
  if (hostnames && hostnames.length > 0) {
    hostname = hostnames.find(h => h.$.type === 'PTR')?.$.name || 
               hostnames[0].$.name
  }

  // Parse ports
  const ports = parsePorts(host.ports?.[0]?.port || [])

  // Parse OS information
  const osInfo = host.os && host.os.length > 0 ? parseOSInfo(host.os[0]) : undefined

  // Get uptime
  let uptimeSeconds: number | undefined
  if (host.uptime?.[0]?.$?.seconds) {
    uptimeSeconds = parseInt(host.uptime[0].$.seconds, 10)
  }

  // Determine device type and vendor
  let deviceType = 'unknown'
  let vendor = macAddress?.$.vendor

  // Try to determine device type from OS info
  if (osInfo?.name) {
    deviceType = classifyDeviceType(osInfo.name)
  }

  // Create services array from ports
  const services = ports
    .filter(port => port.state === 'open' && port.serviceName)
    .map(port => ({
      name: port.serviceName!,
      version: port.serviceVersion,
      port: port.number,
      protocol: port.protocol
    }))

  const device: Device = {
    ip: ipAddress.$.addr,
    mac: macAddress?.$.addr,
    hostname,
    vendor,
    deviceType,
    services,
    ports,
    osInfo,
    lastSeen: new Date(),
    uptimeSeconds,
    isActive: true
  }

  return device
}

function parsePorts(nmapPorts: NmapPort[]): Port[] {
  const ports: Port[] = []

  for (const nmapPort of nmapPorts) {
    const portNumber = parseInt(nmapPort.$.portid, 10)
    const protocol = nmapPort.$.protocol as 'tcp' | 'udp'
    const state = nmapPort.state[0].$.state
    const service = nmapPort.service?.[0]?.$

    // Get service name, fallback to well-known services
    let serviceName = service?.name
    if (!serviceName && state === 'open') {
      serviceName = COMMON_SERVICES[portNumber as keyof typeof COMMON_SERVICES] || undefined
    }

    const port: Port = {
      number: portNumber,
      protocol,
      state: mapPortState(state),
      serviceName,
      serviceVersion: service?.version,
      banner: undefined, // nmap doesn't provide banner in XML by default
      tunnel: service?.tunnel,
      method: service?.method,
      confidence: service?.conf ? parseInt(service.conf, 10) : undefined
    }

    ports.push(port)
  }

  return ports.sort((a, b) => a.number - b.number)
}

function parseOSInfo(osData: any): OSInfo | undefined {
  if (!osData?.osmatch || osData.osmatch.length === 0) {
    return undefined
  }

  // Get the most accurate OS match
  const bestMatch = osData.osmatch.reduce((best: any, current: any) => {
    const currentAccuracy = parseInt(current.$.accuracy, 10)
    const bestAccuracy = parseInt(best.$.accuracy, 10)
    return currentAccuracy > bestAccuracy ? current : best
  })

  const osClass = bestMatch.osclass?.[0]?.$

  return {
    name: bestMatch.$.name,
    version: extractVersionFromOSName(bestMatch.$.name),
    accuracy: parseInt(bestMatch.$.accuracy, 10),
    family: osClass?.osfamily,
    vendor: osClass?.vendor,
    type: osClass?.type
  }
}

function mapPortState(nmapState: string): 'open' | 'closed' | 'filtered' {
  switch (nmapState.toLowerCase()) {
    case 'open':
      return 'open'
    case 'closed':
      return 'closed'
    case 'filtered':
    case 'open|filtered':
    case 'closed|filtered':
      return 'filtered'
    default:
      return 'filtered'
  }
}

function classifyDeviceType(osName: string): string {
  const name = osName.toLowerCase()

  // Server operating systems
  if (name.includes('windows server') || 
      name.includes('linux') && (name.includes('server') || name.includes('centos') || name.includes('rhel') || name.includes('debian') || name.includes('ubuntu server')) ||
      name.includes('freebsd') || 
      name.includes('solaris') ||
      name.includes('aix')) {
    return 'server'
  }

  // Network devices
  if (name.includes('cisco') || 
      name.includes('juniper') || 
      name.includes('router') || 
      name.includes('switch') || 
      name.includes('firewall') ||
      name.includes('fortios') ||
      name.includes('palo alto')) {
    return 'network'
  }

  // Mobile devices
  if (name.includes('ios') || 
      name.includes('android') || 
      name.includes('mobile')) {
    return 'mobile'
  }

  // IoT devices
  if (name.includes('embedded') || 
      name.includes('camera') || 
      name.includes('printer') || 
      name.includes('iot')) {
    return 'iot'
  }

  // Workstations
  if (name.includes('windows') && !name.includes('server') ||
      name.includes('mac os') || 
      name.includes('macos') ||
      name.includes('ubuntu') && !name.includes('server')) {
    return 'workstation'
  }

  return 'unknown'
}

function extractVersionFromOSName(osName: string): string | undefined {
  // Extract version patterns like "Windows 10", "Ubuntu 20.04", etc.
  const versionPatterns = [
    /(\d+\.\d+\.\d+)/,  // x.y.z
    /(\d+\.\d+)/,       // x.y
    /(\d+)/             // x
  ]

  for (const pattern of versionPatterns) {
    const match = osName.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return undefined
}

// Utility functions for parsing specific nmap script outputs
export function parseScriptOutput(scripts: NmapPort['script']): Record<string, string> {
  if (!scripts || scripts.length === 0) {
    return {}
  }

  const scriptResults: Record<string, string> = {}

  for (const script of scripts) {
    if (script.$.id && script.$.output) {
      scriptResults[script.$.id] = script.$.output
    }
  }

  return scriptResults
}

export function extractServiceFingerprint(service: any): {
  product?: string
  version?: string
  extraInfo?: string
  confidence?: number
} {
  if (!service) {
    return {}
  }

  const serviceData = service.$

  return {
    product: serviceData.product,
    version: serviceData.version,
    extraInfo: serviceData.extrainfo,
    confidence: serviceData.conf ? parseInt(serviceData.conf, 10) : undefined
  }
}

// Validation functions
export function validateNmapXML(xmlContent: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!xmlContent || xmlContent.trim().length === 0) {
    errors.push('XML content is empty')
    return { isValid: false, errors }
  }

  if (!xmlContent.includes('<nmaprun')) {
    errors.push('Invalid nmap XML: missing nmaprun root element')
  }

  if (!xmlContent.includes('</nmaprun>')) {
    errors.push('Invalid nmap XML: missing closing nmaprun element')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export async function parseNmapXMLSafe(xmlContent: string): Promise<{ 
  success: boolean
  devices: Device[]
  errors: string[]
}> {
  try {
    const validation = validateNmapXML(xmlContent)
    
    if (!validation.isValid) {
      return {
        success: false,
        devices: [],
        errors: validation.errors
      }
    }

    const devices = await parseNmapXML(xmlContent)
    
    return {
      success: true,
      devices,
      errors: []
    }
  } catch (error) {
    return {
      success: false,
      devices: [],
      errors: [error instanceof Error ? error.message : String(error)]
    }
  }
}