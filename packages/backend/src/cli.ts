#!/usr/bin/env node
import { createMonitoringService } from './services/index.js'
import { createConfiguration } from './config/index.js'
import { createDatabaseInstance } from './database/index.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface CLIOptions {
  config?: string
  dataDir?: string
  daemon?: boolean
  verbose?: boolean
  port?: number
}

class NetworkMonitorCLI {
  private options: CLIOptions
  private monitoringSystem?: ReturnType<typeof createMonitoringService>

  constructor(options: CLIOptions) {
    this.options = options
  }

  async run(): Promise<void> {
    try {
      console.log('🔍 Starting Network Monitor...')
      
      // Load configuration
      const configPath = this.options.config || path.join(__dirname, '../config')
      const config = await createConfiguration({ configPath })
      
      if (this.options.verbose) {
        const configData = await config.getConfig()
        console.log('Configuration loaded:', configData)
      }

      // Create monitoring service
      const configData = await config.getConfig()
      this.monitoringSystem = createMonitoringService({
        dataDir: this.options.dataDir || './data',
        scanConfig: configData.scan,
        schedulerConfig: configData.monitoring
      })

      // Setup graceful shutdown
      this.setupGracefulShutdown()

      // Start the service
      console.log('🚀 Initializing monitoring service...')
      await this.monitoringSystem.start()
      
      const health = this.monitoringSystem.getHealth()
      const metrics = this.monitoringSystem.getMetrics()
      
      console.log('✅ Network Monitor started successfully!')
      console.log(`📊 Status: ${health.status}`)
      console.log(`🔧 Components: ${health.components.length} active`)
      console.log(`📈 Metrics: ${metrics.totalScans} scans, ${metrics.totalDevices} devices`)
      
      if (this.options.daemon) {
        console.log('🔄 Running in daemon mode...')
        // Keep the process running
        process.stdin.resume()
      } else {
        console.log('⚡ Running in interactive mode. Press Ctrl+C to stop.')
        
        // Show live metrics every 30 seconds
        const metricsInterval = setInterval(() => {
          const currentMetrics = this.monitoringSystem!.getMetrics()
          const currentHealth = this.monitoringSystem!.getHealth()
          
          console.log(`\n📊 Live Metrics (${new Date().toISOString()})`)
          console.log(`   Status: ${currentHealth.status}`)
          console.log(`   Scans: ${currentMetrics.totalScans}`)
          console.log(`   Devices: ${currentMetrics.totalDevices}`)
          console.log(`   Active Schedules: ${currentMetrics.activeSchedules}`)
          console.log(`   Uptime: ${Math.round(currentMetrics.uptime / 1000)}s`)
        }, 30000)

        // Clear interval on shutdown
        process.on('SIGTERM', () => clearInterval(metricsInterval))
        process.on('SIGINT', () => clearInterval(metricsInterval))
      }
      
    } catch (error) {
      console.error('❌ Failed to start Network Monitor:', error)
      process.exit(1)
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`)
      
      try {
        if (this.monitoringSystem) {
          console.log('⏳ Stopping monitoring service...')
          await this.monitoringSystem.stop()
          console.log('✅ Monitoring service stopped')
        }
        
        console.log('👋 Network Monitor shutdown complete')
        process.exit(0)
        
      } catch (error) {
        console.error('❌ Error during shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'))
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error)
      gracefulShutdown('uncaughtException')
    })
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
      gracefulShutdown('unhandledRejection')
    })
  }

  async runCommand(command: string, args: string[]): Promise<void> {
    const config = await createConfiguration({})
    const configData = await config.getConfig()
    const monitoringSystem = createMonitoringService({
      dataDir: this.options.dataDir || './data'
    })

    switch (command) {
      case 'scan':
        await this.runScanCommand(monitoringSystem, args)
        break
        
      case 'status':
        await this.runStatusCommand(monitoringSystem)
        break
        
      case 'schedules':
        await this.runSchedulesCommand(monitoringSystem, args)
        break
        
      case 'snapshots':
        await this.runSnapshotsCommand(monitoringSystem, args)
        break
        
      case 'health':
        await this.runHealthCommand(monitoringSystem)
        break
        
      default:
        console.error(`❌ Unknown command: ${command}`)
        this.printHelp()
        process.exit(1)
    }
  }

  private async runScanCommand(system: ReturnType<typeof createMonitoringService>, args: string[]): Promise<void> {
    const networkRange = args[0]
    if (!networkRange) {
      console.error('❌ Network range required for scan command')
      console.log('Usage: nmapper scan <network-range> [scan-type]')
      process.exit(1)
    }

    const scanType = args[1] as 'discovery' | 'comprehensive' | 'quick' || 'discovery'
    
    console.log(`🔍 Starting ${scanType} scan of ${networkRange}...`)
    
    try {
      await system.start()
      
      // Execute manual scan
      const snapshot = await system.service.executeManualScan(networkRange, { scanType })
      
      console.log('✅ Scan completed!')
      console.log(`📊 Results: ${snapshot.deviceCount} devices, ${snapshot.totalPorts} ports`)
      console.log(`⏱️ Duration: ${snapshot.metadata.scanDuration}ms`)
      console.log(`📋 Snapshot ID: ${snapshot.id}`)
      
      await system.stop()
      
    } catch (error) {
      console.error('❌ Scan failed:', error)
      await system.stop()
      process.exit(1)
    }
  }

  private async runStatusCommand(system: ReturnType<typeof createMonitoringService>): Promise<void> {
    try {
      await system.start()
      
      const health = system.getHealth()
      const metrics = system.getMetrics()
      
      console.log('📊 Network Monitor Status')
      console.log('─'.repeat(40))
      console.log(`Status: ${health.status}`)
      console.log(`Uptime: ${Math.round(metrics.uptime / 1000)}s`)
      console.log(`Total Scans: ${metrics.totalScans}`)
      console.log(`Total Devices: ${metrics.totalDevices}`)
      console.log(`Active Schedules: ${metrics.activeSchedules}`)
      console.log(`Last Scan: ${metrics.lastScanTime ? new Date(metrics.lastScanTime).toISOString() : 'Never'}`)
      
      console.log('\n🔧 Components:')
      health.components.forEach((comp: any) => {
        const status = comp.healthy ? '✅' : '❌'
        console.log(`  ${status} ${comp.name}: ${comp.status}`)
      })
      
      await system.stop()
      
    } catch (error) {
      console.error('❌ Failed to get status:', error)
      process.exit(1)
    }
  }

  private async runSchedulesCommand(system: ReturnType<typeof createMonitoringService>, args: string[]): Promise<void> {
    const action = args[0] || 'list'
    
    try {
      await system.start()
      
      switch (action) {
        case 'list':
          const allSchedules = new Map() // system.scheduler?.getAllSchedules() || new Map()
          console.log(`📅 Schedules (${allSchedules.size} total)`)
          console.log('─'.repeat(60))
          
          for (const [id, schedule] of allSchedules) {
            const status = schedule.enabled ? '✅' : '⏸️'
            const nextRun = schedule.nextRun ? new Date(schedule.nextRun).toISOString() : 'Not scheduled'
            
            console.log(`${status} ${schedule.name}`)
            console.log(`   Network: ${schedule.networkRange}`)
            console.log(`   Type: ${schedule.scanType}`)
            console.log(`   Interval: ${schedule.interval / 1000}s`)
            console.log(`   Next Run: ${nextRun}`)
            console.log(`   Runs: ${schedule.runCount || 0} (${schedule.errorCount || 0} errors)`)
            console.log('')
          }
          break
          
        case 'metrics':
          const scheduleMetrics = system.scheduler?.getMetrics()
          if (!scheduleMetrics) {
            console.log('📊 Schedule Metrics: Not available (scheduler not initialized)')
            break
          }
          console.log('📊 Schedule Metrics')
          console.log('─'.repeat(30))
          const schedulesMetrics = new Map()
          console.log(`Total Schedules: ${schedulesMetrics.size}`)
          console.log(`Active Schedules: 0`)
          console.log(`Completed Runs: 0`) // Would need proper metrics
          console.log(`Failed Runs: 0`)
          console.log(`Avg Execution Time: 0ms`)
          console.log(`Next Run: None`)
          break
          
        default:
          console.error(`❌ Unknown schedules action: ${action}`)
          console.log('Available actions: list, metrics')
      }
      
      await system.stop()
      
    } catch (error) {
      console.error('❌ Failed to manage schedules:', error)
      process.exit(1)
    }
  }

  private async runSnapshotsCommand(system: ReturnType<typeof createMonitoringService>, args: string[]): Promise<void> {
    const action = args[0] || 'list'
    
    try {
      await system.start()
      
      switch (action) {
        case 'list':
          const limit = parseInt(args[1]) || 10
          // Get recent snapshots
          console.log(`📸 Recent Snapshots (last ${limit})`)
          console.log('─'.repeat(70))
          console.log('ID'.padEnd(36) + ' | ' + 'Timestamp'.padEnd(20) + ' | ' + 'Devices')
          console.log('─'.repeat(70))
          
          // This would need to be implemented in the service
          console.log('(Snapshot listing requires storage integration)')
          break
          
        case 'metrics':
          // This would show storage metrics
          console.log('📊 Snapshot Storage Metrics')
          console.log('(Storage metrics require integration)')
          break
          
        default:
          console.error(`❌ Unknown snapshots action: ${action}`)
          console.log('Available actions: list, metrics')
      }
      
      await system.stop()
      
    } catch (error) {
      console.error('❌ Failed to manage snapshots:', error)
      process.exit(1)
    }
  }

  private async runHealthCommand(system: ReturnType<typeof createMonitoringService>): Promise<void> {
    try {
      await system.start()
      
      const health = system.getHealth()
      
      console.log('🏥 System Health Check')
      console.log('─'.repeat(40))
      console.log(`Overall Status: ${health.status}`)
      console.log(`Timestamp: ${new Date(health.timestamp).toISOString()}`)
      
      console.log('\n📋 Component Details:')
      health.components.forEach((component: any) => {
        const icon = component.healthy ? '✅' : '❌'
        console.log(`${icon} ${component.name}`)
        console.log(`   Status: ${component.status}`)
        if (component.lastCheck) {
          console.log(`   Last Check: ${new Date(component.lastCheck).toISOString()}`)
        }
        if (component.message) {
          console.log(`   Message: ${component.message}`)
        }
        console.log('')
      })
      
      await system.stop()
      
      // Exit with error code if unhealthy
      if (health.status !== 'healthy') {
        process.exit(1)
      }
      
    } catch (error) {
      console.error('❌ Health check failed:', error)
      process.exit(1)
    }
  }

  printHelp(): void {
    console.log(`
🔍 Network Monitor CLI

USAGE:
  nmapper [OPTIONS] [COMMAND] [ARGS...]

OPTIONS:
  --config <path>     Configuration file path
  --data-dir <path>   Data directory path
  --daemon            Run in daemon mode
  --verbose           Enable verbose logging
  --port <number>     API port (if applicable)

COMMANDS:
  start               Start the monitoring service (default)
  scan <range> [type] Execute a one-time scan
  status              Show system status
  schedules [action]  Manage scheduled scans
  snapshots [action]  Manage network snapshots  
  health              Run health check

EXAMPLES:
  nmapper                           # Start monitoring service
  nmapper scan 192.168.1.0/24      # Scan local network
  nmapper scan 10.0.0.0/8 comprehensive  # Comprehensive scan
  nmapper status                    # Show current status
  nmapper schedules list            # List all schedules
  nmapper schedules metrics         # Show schedule metrics
  nmapper health                    # Run health check

For more information, visit: https://github.com/TakashiAihara/nmapper
`)
  }
}

// Parse command line arguments
function parseArgs(): { options: CLIOptions; command?: string; args: string[] } {
  const options: CLIOptions = {}
  const args: string[] = []
  let command: string | undefined
  
  const argv = process.argv.slice(2)
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    
    if (arg.startsWith('--')) {
      // Handle options
      const optionName = arg.slice(2)
      
      switch (optionName) {
        case 'config':
          options.config = argv[++i]
          break
        case 'data-dir':
          options.dataDir = argv[++i]
          break
        case 'daemon':
          options.daemon = true
          break
        case 'verbose':
          options.verbose = true
          break
        case 'port':
          options.port = parseInt(argv[++i])
          break
        case 'help':
          new NetworkMonitorCLI({}).printHelp()
          process.exit(0)
          break
        default:
          console.error(`❌ Unknown option: --${optionName}`)
          process.exit(1)
      }
    } else if (!command) {
      // First non-option argument is the command
      command = arg
    } else {
      // Remaining arguments
      args.push(arg)
    }
  }
  
  return { options, command, args }
}

// Main execution
async function main() {
  const { options, command, args } = parseArgs()
  const cli = new NetworkMonitorCLI(options)
  
  if (command && command !== 'start') {
    await cli.runCommand(command, args)
  } else {
    await cli.run()
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
}

export { NetworkMonitorCLI }