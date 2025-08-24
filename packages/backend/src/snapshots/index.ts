export * from './storage.js'
export * from './differ.js'
export * from './manager.js'
export * from './versioning.js'
export * from './retention.js'

// Re-export main classes
export { SnapshotStorage } from './storage.js'
export { SnapshotDiffer } from './differ.js'
export { SnapshotManager } from './manager.js'
export { SnapshotVersioning } from './versioning.js'
export { SnapshotRetention } from './retention.js'

// Import classes for factory function
import { SnapshotStorage } from './storage.js'
import { SnapshotDiffer } from './differ.js'
import { SnapshotManager } from './manager.js'
import { SnapshotVersioning } from './versioning.js'
import { SnapshotRetention } from './retention.js'

// Convenience factory function
export function createSnapshotSystem(config?: {
  storage?: any
  versioning?: any
  retention?: any
}) {
  const storage = new SnapshotStorage(config?.storage)
  const differ = new SnapshotDiffer()
  const versioning = new SnapshotVersioning(config?.versioning)
  const retention = new SnapshotRetention(storage, versioning)
  const manager = new SnapshotManager(storage, differ, {
    ...config,
    enableChangeDetection: true
  })

  return {
    storage,
    differ,
    manager,
    versioning,
    retention
  }
}