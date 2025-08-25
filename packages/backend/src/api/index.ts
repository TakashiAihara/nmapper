export * from './server.js'
export * from './handlers/network.js'
export * from './handlers/snapshots.js'
export * from './handlers/system.js'
export * from './handlers/config.js'

// Re-export main classes
export { HonoRPCServer, createHonoRpcService } from './server.js'
export type { RPCServerConfig, RPCContext } from './server.js'

// Import RPC handlers for batch operations
import { NetworkRPCHandlers } from './handlers/network.js'
import { SnapshotRPCHandlers } from './handlers/snapshots.js'
import { SystemRPCHandlers } from './handlers/system.js'
import { ConfigRPCHandlers } from './handlers/config.js'

// Combined RPC handlers for programmatic access
export const RPCHandlers = {
  ...NetworkRPCHandlers,
  ...SnapshotRPCHandlers,
  ...SystemRPCHandlers,
  ...ConfigRPCHandlers
}

// Import the factory function
import { createHonoRpcService as createService } from './server.js'

// Convenience function to create and start the API server
export async function startAPIServer(
  monitoringService: any,
  config?: any
) {
  const server = createService(monitoringService, config)
  await server.start()
  return server
}