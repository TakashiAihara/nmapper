import { EventEmitter } from 'events'
import { createHash } from 'crypto'
import { db, withTransaction } from '../database/index.js'
import type { NetworkSnapshot, Device, Port, SnapshotDiff } from '@nmapper/shared'
import { validateUUID } from '@nmapper/shared'

export interface SnapshotStorageConfig {
  enableCompression?: boolean
  maxSnapshotsPerQuery?: number
  enableMetrics?: boolean
  retentionPolicyEnabled?: boolean
  defaultRetentionDays?: number
}

export interface StorageMetrics {
  totalSnapshots: number
  totalDevices: number
  totalPorts: number
  storageSize: number // bytes
  oldestSnapshot?: Date
  newestSnapshot?: Date
  averageDevicesPerSnapshot: number
}

export interface SnapshotQuery {
  limit?: number
  offset?: number
  startDate?: Date
  endDate?: Date
  deviceIp?: string
  hasDeviceChanges?: boolean
  sortBy?: 'timestamp' | 'deviceCount' | 'totalPorts'
  sortOrder?: 'asc' | 'desc'
}

export class SnapshotStorage extends EventEmitter {
  private config: SnapshotStorageConfig

  constructor(config: SnapshotStorageConfig = {}) {
    super()
    
    this.config = {
      enableCompression: false,
      maxSnapshotsPerQuery: 100,
      enableMetrics: true,
      retentionPolicyEnabled: true,
      defaultRetentionDays: 30,
      ...config
    }
  }

  async saveSnapshot(snapshot: NetworkSnapshot): Promise<string> {
    const startTime = Date.now()

    try {
      // Validate snapshot
      this.validateSnapshot(snapshot)

      // Calculate checksum if not provided
      const checksum = snapshot.checksum || this.calculateSnapshotChecksum(snapshot)

      const savedId = await withTransaction(async (client) => {
        // Insert network snapshot
        const snapshotResult = await client.query(`
          INSERT INTO network_snapshots (
            id, timestamp, device_count, total_ports, checksum,
            scan_duration, scan_type, errors, nmap_version, scan_parameters
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          snapshot.id,
          snapshot.timestamp,
          snapshot.deviceCount,
          snapshot.totalPorts,
          checksum,
          snapshot.metadata.scanDuration,
          snapshot.metadata.scanType,
          snapshot.metadata.errors || [],
          snapshot.metadata.nmapVersion,
          JSON.stringify(snapshot.metadata.scanParameters)
        ])

        const snapshotId = snapshotResult.rows[0].id

        // Insert devices
        for (const device of snapshot.devices) {
          const deviceResult = await client.query(`
            INSERT INTO devices (
              snapshot_id, ip, mac, hostname, vendor, device_type,
              os_name, os_version, os_accuracy, last_seen, uptime_seconds,
              is_active, risk_level, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
          `, [
            snapshotId,
            device.ip,
            device.mac,
            device.hostname,
            device.vendor,
            device.deviceType,
            device.osInfo?.name,
            device.osInfo?.version,
            device.osInfo?.accuracy,
            device.lastSeen,
            device.uptimeSeconds,
            device.isActive,
            device.riskLevel,
            device.notes
          ])

          const deviceId = deviceResult.rows[0].id

          // Insert ports for this device
          if (device.ports && device.ports.length > 0) {
            for (const port of device.ports) {
              await client.query(`
                INSERT INTO ports (
                  device_id, port_number, protocol, state, service_name,
                  service_version, banner, tunnel, method, confidence
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              `, [
                deviceId,
                port.number,
                port.protocol,
                port.state,
                port.serviceName,
                port.serviceVersion,
                port.banner,
                port.tunnel,
                port.method,
                port.confidence
              ])
            }
          }
        }

        return snapshotId
      })

      const duration = Date.now() - startTime
      
      if (this.config.enableMetrics) {
        this.emit('snapshot-saved', {
          snapshotId: savedId,
          deviceCount: snapshot.deviceCount,
          totalPorts: snapshot.totalPorts,
          duration
        })
      }

      console.log(`Snapshot ${savedId} saved successfully in ${duration}ms`)
      return savedId

    } catch (error) {
      this.emit('snapshot-save-error', {
        snapshotId: snapshot.id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async getSnapshot(snapshotId: string): Promise<NetworkSnapshot | null> {
    if (!validateUUID(snapshotId)) {
      throw new Error('Invalid snapshot ID format')
    }

    try {
      // Get snapshot metadata
      const snapshotResult = await db.executeQuerySingle(`
        SELECT 
          id, timestamp, device_count, total_ports, checksum,
          scan_duration, scan_type, errors, nmap_version, scan_parameters,
          created_at
        FROM network_snapshots 
        WHERE id = $1
      `, [snapshotId])

      if (!snapshotResult) {
        return null
      }

      // Get devices with their ports
      const devices = await this.getSnapshotDevices(snapshotId)

      return {
        id: snapshotResult.id,
        timestamp: snapshotResult.timestamp,
        deviceCount: snapshotResult.device_count,
        totalPorts: snapshotResult.total_ports,
        checksum: snapshotResult.checksum,
        devices,
        metadata: {
          scanDuration: snapshotResult.scan_duration,
          scanType: snapshotResult.scan_type,
          errors: snapshotResult.errors || [],
          nmapVersion: snapshotResult.nmap_version,
          scanParameters: snapshotResult.scan_parameters
        }
      }

    } catch (error) {
      console.error(`Failed to get snapshot ${snapshotId}:`, error)
      throw error
    }
  }

  private async getSnapshotDevices(snapshotId: string): Promise<Device[]> {
    const devicesQuery = `
      SELECT 
        d.id, d.ip, d.mac, d.hostname, d.vendor, d.device_type,
        d.os_name, d.os_version, d.os_accuracy, d.last_seen,
        d.uptime_seconds, d.is_active, d.risk_level, d.notes
      FROM devices d
      WHERE d.snapshot_id = $1
      ORDER BY d.ip
    `

    const deviceResults = await db.executeQuery(devicesQuery, [snapshotId])
    const devices: Device[] = []

    for (const deviceRow of deviceResults) {
      // Get ports for this device
      const portsQuery = `
        SELECT 
          port_number, protocol, state, service_name, service_version,
          banner, tunnel, method, confidence
        FROM ports
        WHERE device_id = $1
        ORDER BY port_number
      `

      const portResults = await db.executeQuery(portsQuery, [deviceRow.id])
      const ports: Port[] = portResults.map(portRow => ({
        number: portRow.port_number,
        protocol: portRow.protocol,
        state: portRow.state,
        serviceName: portRow.service_name,
        serviceVersion: portRow.service_version,
        banner: portRow.banner,
        tunnel: portRow.tunnel,
        method: portRow.method,
        confidence: portRow.confidence
      }))

      // Create services array from ports
      const services = ports
        .filter(port => port.state === 'open' && port.serviceName)
        .map(port => ({
          name: port.serviceName!,
          port: port.number,
          protocol: port.protocol,
          version: port.serviceVersion,
          confidence: port.confidence
        }))

      const device: Device = {
        ip: deviceRow.ip,
        mac: deviceRow.mac,
        hostname: deviceRow.hostname,
        vendor: deviceRow.vendor,
        deviceType: deviceRow.device_type,
        osInfo: deviceRow.os_name ? {
          name: deviceRow.os_name,
          version: deviceRow.os_version,
          accuracy: deviceRow.os_accuracy
        } : undefined,
        ports,
        services,
        lastSeen: deviceRow.last_seen,
        uptimeSeconds: deviceRow.uptime_seconds,
        isActive: deviceRow.is_active,
        riskLevel: deviceRow.risk_level,
        notes: deviceRow.notes
      }

      devices.push(device)
    }

    return devices
  }

  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    if (!validateUUID(snapshotId)) {
      throw new Error('Invalid snapshot ID format')
    }

    try {
      const deletedCount = await db.hardDelete(
        'network_snapshots',
        'id = $1',
        [snapshotId]
      )

      if (deletedCount > 0) {
        this.emit('snapshot-deleted', { snapshotId })
        console.log(`Snapshot ${snapshotId} deleted successfully`)
        return true
      }

      return false

    } catch (error) {
      this.emit('snapshot-delete-error', {
        snapshotId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async querySnapshots(query: SnapshotQuery = {}): Promise<{
    snapshots: NetworkSnapshot[]
    totalCount: number
    hasMore: boolean
  }> {
    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      deviceIp,
      hasDeviceChanges,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = query

    // Validate limit
    if (limit > this.config.maxSnapshotsPerQuery!) {
      throw new Error(`Limit exceeds maximum allowed: ${this.config.maxSnapshotsPerQuery}`)
    }

    try {
      // Build WHERE conditions
      const conditions: string[] = ['1=1']
      const params: any[] = []
      let paramIndex = 1

      if (startDate) {
        conditions.push(`timestamp >= $${paramIndex++}`)
        params.push(startDate)
      }

      if (endDate) {
        conditions.push(`timestamp <= $${paramIndex++}`)
        params.push(endDate)
      }

      if (deviceIp) {
        conditions.push(`EXISTS (
          SELECT 1 FROM devices d 
          WHERE d.snapshot_id = network_snapshots.id 
          AND d.ip = $${paramIndex++}
        )`)
        params.push(deviceIp)
      }

      if (hasDeviceChanges !== undefined) {
        if (hasDeviceChanges) {
          conditions.push('device_count > 0')
        } else {
          conditions.push('device_count = 0')
        }
      }

      const whereClause = conditions.join(' AND ')

      // Build ORDER BY clause
      const validSortColumns = ['timestamp', 'device_count', 'total_ports']
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'timestamp'
      const order = sortOrder === 'asc' ? 'ASC' : 'DESC'

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count
        FROM network_snapshots
        WHERE ${whereClause}
      `
      const countResult = await db.executeQuerySingle<{ count: string }>(countQuery, params)
      const totalCount = parseInt(countResult?.count || '0')

      // Get snapshots
      const snapshotsQuery = `
        SELECT 
          id, timestamp, device_count, total_ports, checksum,
          scan_duration, scan_type, errors, nmap_version, scan_parameters
        FROM network_snapshots
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${order}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `
      params.push(limit, offset)

      const snapshotResults = await db.executeQuery(snapshotsQuery, params)

      // Convert to NetworkSnapshot objects (without devices for performance)
      const snapshots: NetworkSnapshot[] = snapshotResults.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        deviceCount: row.device_count,
        totalPorts: row.total_ports,
        checksum: row.checksum,
        devices: [], // Empty for list queries
        metadata: {
          scanDuration: row.scan_duration,
          scanType: row.scan_type,
          errors: row.errors || [],
          nmapVersion: row.nmap_version,
          scanParameters: row.scan_parameters
        }
      }))

      return {
        snapshots,
        totalCount,
        hasMore: offset + limit < totalCount
      }

    } catch (error) {
      console.error('Failed to query snapshots:', error)
      throw error
    }
  }

  async getLatestSnapshot(): Promise<NetworkSnapshot | null> {
    const result = await this.querySnapshots({
      limit: 1,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    })

    if (result.snapshots.length === 0) {
      return null
    }

    // Get full snapshot with devices
    return this.getSnapshot(result.snapshots[0].id)
  }

  async getSnapshotHistory(deviceIp: string, limit = 10): Promise<NetworkSnapshot[]> {
    const result = await this.querySnapshots({
      deviceIp,
      limit,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    })

    // Get full snapshots with devices
    const snapshots: NetworkSnapshot[] = []
    for (const snapshot of result.snapshots) {
      const fullSnapshot = await this.getSnapshot(snapshot.id)
      if (fullSnapshot) {
        snapshots.push(fullSnapshot)
      }
    }

    return snapshots
  }

  async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      const metricsQuery = `
        SELECT 
          COUNT(*) as total_snapshots,
          SUM(device_count) as total_devices,
          SUM(total_ports) as total_ports,
          MIN(timestamp) as oldest_snapshot,
          MAX(timestamp) as newest_snapshot,
          AVG(device_count) as avg_devices_per_snapshot
        FROM network_snapshots
      `

      const result = await db.executeQuerySingle(metricsQuery)
      
      if (!result) {
        return {
          totalSnapshots: 0,
          totalDevices: 0,
          totalPorts: 0,
          storageSize: 0,
          averageDevicesPerSnapshot: 0
        }
      }

      // Get approximate storage size (this is an estimate)
      const storageSizeQuery = `
        SELECT pg_total_relation_size('network_snapshots') + 
               pg_total_relation_size('devices') + 
               pg_total_relation_size('ports') as storage_size
      `
      const sizeResult = await db.executeQuerySingle<{ storage_size: number }>(storageSizeQuery)

      return {
        totalSnapshots: parseInt(result.total_snapshots || '0'),
        totalDevices: parseInt(result.total_devices || '0'),
        totalPorts: parseInt(result.total_ports || '0'),
        storageSize: sizeResult?.storage_size || 0,
        oldestSnapshot: result.oldest_snapshot,
        newestSnapshot: result.newest_snapshot,
        averageDevicesPerSnapshot: parseFloat(result.avg_devices_per_snapshot || '0')
      }

    } catch (error) {
      console.error('Failed to get storage metrics:', error)
      throw error
    }
  }

  async cleanupOldSnapshots(retentionDays?: number): Promise<number> {
    const days = retentionDays || this.config.defaultRetentionDays || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    try {
      const deletedCount = await db.hardDelete(
        'network_snapshots',
        'timestamp < $1',
        [cutoffDate]
      )

      if (deletedCount > 0) {
        this.emit('snapshots-cleaned', {
          deletedCount,
          cutoffDate,
          retentionDays: days
        })
        console.log(`Cleaned up ${deletedCount} snapshots older than ${days} days`)
      }

      return deletedCount

    } catch (error) {
      console.error('Failed to cleanup old snapshots:', error)
      throw error
    }
  }

  async snapshotExists(snapshotId: string): Promise<boolean> {
    if (!validateUUID(snapshotId)) {
      return false
    }

    return db.exists('network_snapshots', 'id = $1', [snapshotId])
  }

  async getSnapshotCount(): Promise<number> {
    return db.count('network_snapshots')
  }

  private validateSnapshot(snapshot: NetworkSnapshot): void {
    if (!snapshot.id) {
      throw new Error('Snapshot ID is required')
    }

    if (!validateUUID(snapshot.id)) {
      throw new Error('Invalid snapshot ID format')
    }

    if (!snapshot.timestamp) {
      throw new Error('Snapshot timestamp is required')
    }

    if (!Array.isArray(snapshot.devices)) {
      throw new Error('Snapshot devices must be an array')
    }

    // Validate device count matches
    if (snapshot.deviceCount !== snapshot.devices.length) {
      throw new Error('Device count mismatch')
    }

    // Validate total ports matches
    const actualPortCount = snapshot.devices.reduce(
      (sum, device) => sum + (device.ports?.length || 0),
      0
    )
    if (snapshot.totalPorts !== actualPortCount) {
      throw new Error('Total ports count mismatch')
    }
  }

  private calculateSnapshotChecksum(snapshot: NetworkSnapshot): string {
    const deviceData = snapshot.devices
      .map(device => `${device.ip}:${device.fingerprint || ''}`)
      .sort()
      .join(',')

    return createHash('md5').update(deviceData).digest('hex')
  }

  getConfig(): SnapshotStorageConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<SnapshotStorageConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.emit('config-updated', this.config)
  }
}