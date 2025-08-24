export * from './connection.js'
export * from './migrations.js'
export * from './utils.js'

export { database } from './connection.js'
export { db } from './utils.js'

// Import database
import { database } from './connection.js'

// Factory function for convenience
export function createDatabaseInstance() {
  return database
}