import { spawn, ChildProcess } from 'child_process'
import { writeFile, unlink, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { 
  validateIP, 
  validatePortRange, 
  validateNetworkRange,
  NETWORK_CONSTANTS,
  SCAN_TYPES,
  PROTOCOLS
} from '@nmapper/shared'

export interface NmapOptions {
  // Basic options
  targets: string[]
  ports?: string
  scanType?: string
  protocol?: string
  
  // Discovery options
  skipHostDiscovery?: boolean
  dnsResolution?: boolean
  
  // Service detection
  serviceDetection?: boolean
  serviceVersionIntensity?: number
  
  // OS detection
  osDetection?: boolean
  osGuessAggressive?: boolean
  
  // Script scanning
  scriptScan?: boolean
  scripts?: string[]
  
  // Timing and performance
  timingTemplate?: number // 0-5
  minRate?: number
  maxRate?: number
  maxRetries?: number
  hostTimeout?: number
  
  // Output options
  outputXml?: string
  outputNormal?: string
  verbosity?: number
  
  // Stealth options
  fragmentPackets?: boolean
  decoyHosts?: string[]
  spoofSource?: string
  
  // Custom options
  customOptions?: string[]
}

export interface NmapExecutionResult {
  exitCode: number
  stdout: string
  stderr: string
  xmlOutput?: string
  duration: number
  command: string
}

export interface NmapValidationError {
  field: string
  value: any
  message: string
}

export class NmapCommandBuilder {
  private options: NmapOptions
  private errors: NmapValidationError[] = []

  constructor(options: NmapOptions) {
    this.options = { ...options }
    this.validate()
  }

  private validate(): void {
    this.errors = []

    // Validate targets
    if (!this.options.targets || this.options.targets.length === 0) {
      this.errors.push({
        field: 'targets',
        value: this.options.targets,
        message: 'At least one target must be specified'
      })
    } else {
      for (const target of this.options.targets) {
        if (!validateIP(target) && !validateNetworkRange(target)) {
          this.errors.push({
            field: 'targets',
            value: target,
            message: `Invalid target: ${target}`
          })
        }
      }
    }

    // Validate port range
    if (this.options.ports && !validatePortRange(this.options.ports)) {
      this.errors.push({
        field: 'ports',
        value: this.options.ports,
        message: 'Invalid port range format'
      })
    }

    // Validate timing template
    if (this.options.timingTemplate !== undefined) {
      if (this.options.timingTemplate < 0 || this.options.timingTemplate > 5) {
        this.errors.push({
          field: 'timingTemplate',
          value: this.options.timingTemplate,
          message: 'Timing template must be between 0-5'
        })
      }
    }

    // Validate service version intensity
    if (this.options.serviceVersionIntensity !== undefined) {
      if (this.options.serviceVersionIntensity < 0 || this.options.serviceVersionIntensity > 9) {
        this.errors.push({
          field: 'serviceVersionIntensity',
          value: this.options.serviceVersionIntensity,
          message: 'Service version intensity must be between 0-9'
        })
      }
    }

    // Validate verbosity
    if (this.options.verbosity !== undefined) {
      if (this.options.verbosity < 0 || this.options.verbosity > 9) {
        this.errors.push({
          field: 'verbosity',
          value: this.options.verbosity,
          message: 'Verbosity must be between 0-9'
        })
      }
    }
  }

  getValidationErrors(): NmapValidationError[] {
    return [...this.errors]
  }

  isValid(): boolean {
    return this.errors.length === 0
  }

  buildCommand(): string[] {
    if (!this.isValid()) {
      throw new Error(`Invalid nmap options: ${this.errors.map(e => e.message).join(', ')}`)
    }

    const args: string[] = ['nmap']

    // Add scan type
    switch (this.options.scanType) {
      case SCAN_TYPES.SYN:
        args.push('-sS')
        break
      case SCAN_TYPES.CONNECT:
        args.push('-sT')
        break
      case SCAN_TYPES.UDP:
        args.push('-sU')
        break
      case SCAN_TYPES.COMPREHENSIVE:
        args.push('-sS', '-sU')
        break
      default:
        args.push('-sS') // Default to SYN scan
    }

    // Add port specification
    if (this.options.ports) {
      args.push('-p', this.options.ports)
    }

    // Host discovery options
    if (this.options.skipHostDiscovery) {
      args.push('-Pn')
    }

    if (this.options.dnsResolution === false) {
      args.push('-n')
    }

    // Service detection
    if (this.options.serviceDetection) {
      args.push('-sV')
      
      if (this.options.serviceVersionIntensity !== undefined) {
        args.push(`--version-intensity=${this.options.serviceVersionIntensity}`)
      }
    }

    // OS detection
    if (this.options.osDetection) {
      args.push('-O')
      
      if (this.options.osGuessAggressive) {
        args.push('--osscan-guess')
      }
    }

    // Script scanning
    if (this.options.scriptScan) {
      if (this.options.scripts && this.options.scripts.length > 0) {
        args.push('--script', this.options.scripts.join(','))
      } else {
        args.push('-sC') // Default scripts
      }
    }

    // Timing template
    if (this.options.timingTemplate !== undefined) {
      args.push(`-T${this.options.timingTemplate}`)
    }

    // Rate limiting
    if (this.options.minRate) {
      args.push(`--min-rate=${this.options.minRate}`)
    }

    if (this.options.maxRate) {
      args.push(`--max-rate=${this.options.maxRate}`)
    }

    // Retry options
    if (this.options.maxRetries !== undefined) {
      args.push(`--max-retries=${this.options.maxRetries}`)
    }

    // Host timeout
    if (this.options.hostTimeout) {
      args.push(`--host-timeout=${this.options.hostTimeout}ms`)
    }

    // Output options
    if (this.options.outputXml) {
      args.push('-oX', this.options.outputXml)
    }

    if (this.options.outputNormal) {
      args.push('-oN', this.options.outputNormal)
    }

    // Verbosity
    if (this.options.verbosity !== undefined) {
      if (this.options.verbosity > 0) {
        args.push(`-${'v'.repeat(this.options.verbosity)}`)
      } else {
        args.push('-q')
      }
    }

    // Stealth options
    if (this.options.fragmentPackets) {
      args.push('-f')
    }

    if (this.options.decoyHosts && this.options.decoyHosts.length > 0) {
      args.push('-D', this.options.decoyHosts.join(','))
    }

    if (this.options.spoofSource) {
      args.push('-S', this.options.spoofSource)
    }

    // Custom options
    if (this.options.customOptions && this.options.customOptions.length > 0) {
      args.push(...this.options.customOptions)
    }

    // Add targets (must be last)
    args.push(...this.options.targets)

    return args
  }

  getCommandString(): string {
    return this.buildCommand().join(' ')
  }
}

export class NmapExecutor {
  private nmapPath: string
  private defaultTimeout: number
  private maxConcurrentScans: number
  private activeScanCount = 0

  constructor(
    nmapPath: string = 'nmap',
    defaultTimeout: number = NETWORK_CONSTANTS.DEFAULT_TIMEOUT,
    maxConcurrentScans: number = 1
  ) {
    this.nmapPath = nmapPath
    this.defaultTimeout = defaultTimeout
    this.maxConcurrentScans = maxConcurrentScans
  }

  async checkNmapAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const result = await this.executeCommand([this.nmapPath, '--version'], 5000)
      
      if (result.exitCode === 0) {
        const versionMatch = result.stdout.match(/Nmap version ([\d.]+)/)
        return {
          available: true,
          version: versionMatch ? versionMatch[1] : 'unknown'
        }
      }

      return {
        available: false,
        error: `nmap returned exit code ${result.exitCode}: ${result.stderr}`
      }
    } catch (error) {
      return {
        available: false,
        error: `Failed to execute nmap: ${error}`
      }
    }
  }

  async executeScan(options: NmapOptions): Promise<NmapExecutionResult> {
    // Check if we can start a new scan
    if (this.activeScanCount >= this.maxConcurrentScans) {
      throw new Error(`Maximum concurrent scans (${this.maxConcurrentScans}) exceeded`)
    }

    this.activeScanCount++

    try {
      const builder = new NmapCommandBuilder(options)
      
      if (!builder.isValid()) {
        const errors = builder.getValidationErrors().map(e => e.message).join(', ')
        throw new Error(`Invalid scan options: ${errors}`)
      }

      // Create temporary file for XML output if not specified
      let xmlOutputFile: string | undefined
      let shouldCleanupXml = false

      if (!options.outputXml) {
        const tempDir = await mkdtemp(join(tmpdir(), 'nmap-'))
        xmlOutputFile = join(tempDir, 'scan-result.xml')
        options.outputXml = xmlOutputFile
        shouldCleanupXml = true
      }

      const command = builder.buildCommand()
      const timeout = options.hostTimeout || this.defaultTimeout

      console.log(`Executing nmap scan: ${builder.getCommandString()}`)
      
      const startTime = Date.now()
      const result = await this.executeCommand(command, timeout)
      const duration = Date.now() - startTime

      // Read XML output if available
      let xmlOutput: string | undefined
      if (options.outputXml) {
        try {
          const { readFile } = await import('fs/promises')
          xmlOutput = await readFile(options.outputXml, 'utf-8')
        } catch (error) {
          console.warn(`Failed to read XML output file: ${error}`)
        }

        // Cleanup temporary XML file
        if (shouldCleanupXml) {
          try {
            await unlink(options.outputXml)
          } catch (error) {
            console.warn(`Failed to cleanup temporary XML file: ${error}`)
          }
        }
      }

      return {
        ...result,
        xmlOutput,
        duration,
        command: builder.getCommandString()
      }

    } finally {
      this.activeScanCount--
    }
  }

  private executeCommand(command: string[], timeout: number): Promise<NmapExecutionResult> {
    return new Promise((resolve, reject) => {
      const [executable, ...args] = command
      const child: ChildProcess = spawn(executable, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      })

      let stdout = ''
      let stderr = ''
      let isTimedOut = false

      // Set up timeout
      const timeoutId = setTimeout(() => {
        isTimedOut = true
        child.kill('SIGTERM')
        
        // Force kill after additional timeout
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL')
          }
        }, 5000)
      }, timeout)

      // Collect output
      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('error', (error) => {
        clearTimeout(timeoutId)
        reject(new Error(`Failed to execute command: ${error.message}`))
      })

      child.on('close', (code) => {
        clearTimeout(timeoutId)
        
        if (isTimedOut) {
          reject(new Error(`Command timed out after ${timeout}ms`))
          return
        }

        resolve({
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          duration: 0, // Will be set by caller
          command: command.join(' ')
        })
      })
    })
  }

  getActiveScanCount(): number {
    return this.activeScanCount
  }

  getMaxConcurrentScans(): number {
    return this.maxConcurrentScans
  }

  setMaxConcurrentScans(max: number): void {
    if (max < 1) {
      throw new Error('Maximum concurrent scans must be at least 1')
    }
    this.maxConcurrentScans = max
  }
}

// Convenience functions for common scan types
export function createHostDiscoveryScan(networkRange: string): NmapOptions {
  return {
    targets: [networkRange],
    scanType: SCAN_TYPES.SYN,
    ports: '1-1000',
    serviceDetection: false,
    osDetection: false,
    scriptScan: false,
    timingTemplate: 3,
    verbosity: 1
  }
}

export function createPortScan(target: string, ports?: string): NmapOptions {
  return {
    targets: [target],
    scanType: SCAN_TYPES.SYN,
    ports: ports || NETWORK_CONSTANTS.DEFAULT_PORT_RANGE,
    serviceDetection: true,
    osDetection: false,
    scriptScan: false,
    timingTemplate: 3,
    verbosity: 1
  }
}

export function createComprehensiveScan(target: string): NmapOptions {
  return {
    targets: [target],
    scanType: SCAN_TYPES.COMPREHENSIVE,
    ports: '1-65535',
    serviceDetection: true,
    serviceVersionIntensity: 5,
    osDetection: true,
    scriptScan: true,
    timingTemplate: 4,
    verbosity: 2
  }
}

export function createQuickScan(targets: string[]): NmapOptions {
  return {
    targets,
    scanType: SCAN_TYPES.SYN,
    ports: NETWORK_CONSTANTS.COMMON_PORTS,
    serviceDetection: true,
    osDetection: false,
    scriptScan: false,
    timingTemplate: 4,
    verbosity: 1
  }
}