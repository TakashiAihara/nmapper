export * from './nmap.js'
export * from './scanner.js'
export * from './parser.js'
export * from './processor.js'
export * from './scheduler.js'

// Re-export main classes
export { 
  NmapCommandBuilder, 
  NmapExecutor,
  createHostDiscoveryScan,
  createPortScan,
  createComprehensiveScan,
  createQuickScan
} from './nmap.js'

export {
  NetworkScanner,
  ScanType,
  ScanStage
} from './scanner.js'

export {
  parseNmapXML,
  parseNmapXMLSafe,
  validateNmapXML
} from './parser.js'

export {
  ScanResultProcessor
} from './processor.js'

export {
  ScanScheduler
} from './scheduler.js'

// Import classes for factory function
import { NetworkScanner } from './scanner.js'
import { ScanResultProcessor } from './processor.js'
import { ScanScheduler } from './scheduler.js'

// Convenience factory function
export function createScanningSystem(config?: {
  nmapPath?: string
  maxConcurrentScans?: number
  defaultTimeout?: number
}) {
  const scanner = new NetworkScanner(config)
  const processor = new ScanResultProcessor()
  const scheduler = new ScanScheduler(scanner, processor, config)

  return {
    scanner,
    processor,
    scheduler
  }
}