import { EventEmitter } from 'events'
import { db } from '../database/index.js'
import type { NetworkSnapshot, SnapshotDiff, Device } from '@nmapper/shared'

export interface SnapshotVersion {
  version: string
  snapshotId: string
  timestamp: Date
  parentVersion?: string
  tags: string[]
  description?: string
  metadata: {
    deviceCount: number
    totalPorts: number
    changesFromParent?: {
      devicesAdded: number
      devicesRemoved: number
      devicesChanged: number
    }
  }
  createdBy?: string
  isStable: boolean
}

export interface VersionBranch {
  name: string
  headVersion: string
  description?: string
  createdAt: Date
  lastCommit: Date
  isDefault: boolean
  versions: SnapshotVersion[]
}

export interface VersionTag {
  name: string
  version: string
  message?: string
  createdAt: Date
  createdBy?: string
}

export interface VersioningConfig {
  defaultBranch?: string
  maxVersionsPerBranch?: number
  enableAutomaticVersioning?: boolean
  autoTagStableVersions?: boolean
  compressionEnabled?: boolean
}

export class SnapshotVersioning extends EventEmitter {
  private config: VersioningConfig

  constructor(config: VersioningConfig = {}) {
    super()
    
    this.config = {
      defaultBranch: 'main',
      maxVersionsPerBranch: 100,
      enableAutomaticVersioning: true,
      autoTagStableVersions: true,
      compressionEnabled: false,
      ...config
    }
  }

  async initializeVersioning(): Promise<void> {
    try {
      // Create versioning tables if they don't exist
      await this.createVersioningTables()
      
      // Ensure default branch exists
      await this.ensureDefaultBranch()
      
      console.log('Snapshot versioning initialized')
      this.emit('versioning-initialized')

    } catch (error) {
      console.error('Failed to initialize versioning:', error)
      throw error
    }
  }

  private async createVersioningTables(): Promise<void> {
    const queries = [
      // Snapshot versions table
      `CREATE TABLE IF NOT EXISTS snapshot_versions (
        version VARCHAR(50) PRIMARY KEY,
        snapshot_id UUID NOT NULL REFERENCES network_snapshots(id) ON DELETE CASCADE,
        branch_name VARCHAR(100) NOT NULL DEFAULT 'main',
        parent_version VARCHAR(50) REFERENCES snapshot_versions(version),
        description TEXT,
        tags TEXT[] DEFAULT '{}',
        metadata JSONB NOT NULL,
        created_by VARCHAR(100),
        is_stable BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        
        INDEX idx_snapshot_versions_branch (branch_name),
        INDEX idx_snapshot_versions_created_at (created_at),
        INDEX idx_snapshot_versions_stable (is_stable)
      )`,

      // Version branches table
      `CREATE TABLE IF NOT EXISTS version_branches (
        name VARCHAR(100) PRIMARY KEY,
        head_version VARCHAR(50) REFERENCES snapshot_versions(version),
        description TEXT,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_commit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        
        INDEX idx_version_branches_default (is_default),
        INDEX idx_version_branches_last_commit (last_commit)
      )`,

      // Version tags table
      `CREATE TABLE IF NOT EXISTS version_tags (
        name VARCHAR(100) PRIMARY KEY,
        version VARCHAR(50) NOT NULL REFERENCES snapshot_versions(version) ON DELETE CASCADE,
        message TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        
        INDEX idx_version_tags_version (version),
        INDEX idx_version_tags_created_at (created_at)
      )`
    ]

    for (const query of queries) {
      await db.executeQuery(query)
    }
  }

  private async ensureDefaultBranch(): Promise<void> {
    const defaultBranch = this.config.defaultBranch!
    
    const exists = await db.exists(
      'version_branches',
      'name = $1',
      [defaultBranch]
    )

    if (!exists) {
      await db.createRecord('version_branches', {
        name: defaultBranch,
        description: 'Default branch for snapshot versions',
        is_default: true
      })
    }
  }

  async createVersion(
    snapshot: NetworkSnapshot,
    options: {
      branch?: string
      parentVersion?: string
      description?: string
      tags?: string[]
      createdBy?: string
      isStable?: boolean
    } = {}
  ): Promise<SnapshotVersion> {
    const branch = options.branch || this.config.defaultBranch!
    const version = this.generateVersionId(branch)

    try {
      // Calculate changes from parent if specified
      let changesFromParent: SnapshotVersion['metadata']['changesFromParent']
      
      if (options.parentVersion) {
        const parentSnapshot = await this.getSnapshotByVersion(options.parentVersion)
        if (parentSnapshot) {
          // This would require the differ to calculate changes
          // For now, we'll set it as undefined and calculate it separately
          changesFromParent = {
            devicesAdded: 0,
            devicesRemoved: 0,
            devicesChanged: 0
          }
        }
      }

      const versionData: SnapshotVersion = {
        version,
        snapshotId: snapshot.id,
        timestamp: snapshot.timestamp,
        parentVersion: options.parentVersion,
        tags: options.tags || [],
        description: options.description,
        metadata: {
          deviceCount: snapshot.deviceCount,
          totalPorts: snapshot.totalPorts,
          changesFromParent
        },
        createdBy: options.createdBy,
        isStable: options.isStable || false
      }

      // Store version in database
      await db.createRecord('snapshot_versions', {
        version: versionData.version,
        snapshot_id: versionData.snapshotId,
        branch_name: branch,
        parent_version: versionData.parentVersion,
        description: versionData.description,
        tags: versionData.tags,
        metadata: JSON.stringify(versionData.metadata),
        created_by: versionData.createdBy,
        is_stable: versionData.isStable
      })

      // Update branch head
      await this.updateBranchHead(branch, version)

      // Auto-tag if stable and enabled
      if (versionData.isStable && this.config.autoTagStableVersions) {
        await this.createTag(version, `stable-${Date.now()}`, 'Auto-tagged stable version')
      }

      this.emit('version-created', versionData)
      console.log(`Created version ${version} for snapshot ${snapshot.id}`)

      return versionData

    } catch (error) {
      console.error(`Failed to create version for snapshot ${snapshot.id}:`, error)
      throw error
    }
  }

  async getVersion(version: string): Promise<SnapshotVersion | null> {
    try {
      const result = await db.executeQuerySingle(`
        SELECT 
          version, snapshot_id, branch_name, parent_version, description,
          tags, metadata, created_by, is_stable, created_at
        FROM snapshot_versions 
        WHERE version = $1
      `, [version])

      if (!result) {
        return null
      }

      return {
        version: result.version,
        snapshotId: result.snapshot_id,
        timestamp: result.created_at,
        parentVersion: result.parent_version,
        tags: result.tags || [],
        description: result.description,
        metadata: JSON.parse(result.metadata),
        createdBy: result.created_by,
        isStable: result.is_stable
      }

    } catch (error) {
      console.error(`Failed to get version ${version}:`, error)
      throw error
    }
  }

  async getSnapshotByVersion(version: string): Promise<NetworkSnapshot | null> {
    const versionInfo = await this.getVersion(version)
    
    if (!versionInfo) {
      return null
    }

    // Get the actual snapshot
    const snapshot = await db.executeQuerySingle(`
      SELECT 
        id, timestamp, device_count, total_ports, checksum,
        scan_duration, scan_type, errors, nmap_version, scan_parameters
      FROM network_snapshots 
      WHERE id = $1
    `, [versionInfo.snapshotId])

    if (!snapshot) {
      return null
    }

    // Get devices (simplified - in a real implementation, you'd use the storage layer)
    const devices = await db.executeQuery(`
      SELECT d.*, array_agg(
        json_build_object(
          'number', p.port_number,
          'protocol', p.protocol,
          'state', p.state,
          'serviceName', p.service_name,
          'serviceVersion', p.service_version
        )
      ) as ports
      FROM devices d
      LEFT JOIN ports p ON d.id = p.device_id
      WHERE d.snapshot_id = $1
      GROUP BY d.id
    `, [versionInfo.snapshotId])

    const networkDevices: Device[] = devices.map(deviceRow => ({
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
      ports: deviceRow.ports || [],
      services: [], // Would be derived from ports
      lastSeen: deviceRow.last_seen,
      uptimeSeconds: deviceRow.uptime_seconds,
      isActive: deviceRow.is_active,
      riskLevel: deviceRow.risk_level,
      notes: deviceRow.notes
    }))

    return {
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      deviceCount: snapshot.device_count,
      totalPorts: snapshot.total_ports,
      checksum: snapshot.checksum,
      devices: networkDevices,
      metadata: {
        scanDuration: snapshot.scan_duration,
        scanType: snapshot.scan_type,
        errors: snapshot.errors || [],
        nmapVersion: snapshot.nmap_version,
        scanParameters: snapshot.scan_parameters
      }
    }
  }

  async getBranchVersions(branchName: string, limit = 50): Promise<SnapshotVersion[]> {
    try {
      const results = await db.executeQuery(`
        SELECT 
          version, snapshot_id, parent_version, description,
          tags, metadata, created_by, is_stable, created_at
        FROM snapshot_versions 
        WHERE branch_name = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [branchName, limit])

      return results.map(result => ({
        version: result.version,
        snapshotId: result.snapshot_id,
        timestamp: result.created_at,
        parentVersion: result.parent_version,
        tags: result.tags || [],
        description: result.description,
        metadata: JSON.parse(result.metadata),
        createdBy: result.created_by,
        isStable: result.is_stable
      }))

    } catch (error) {
      console.error(`Failed to get versions for branch ${branchName}:`, error)
      throw error
    }
  }

  async createBranch(
    name: string,
    options: {
      fromVersion?: string
      description?: string
      createdBy?: string
    } = {}
  ): Promise<VersionBranch> {
    try {
      // Check if branch already exists
      const exists = await db.exists('version_branches', 'name = $1', [name])
      if (exists) {
        throw new Error(`Branch ${name} already exists`)
      }

      const branch: VersionBranch = {
        name,
        headVersion: options.fromVersion || '',
        description: options.description,
        createdAt: new Date(),
        lastCommit: new Date(),
        isDefault: false,
        versions: []
      }

      await db.createRecord('version_branches', {
        name: branch.name,
        head_version: branch.headVersion || null,
        description: branch.description,
        is_default: branch.isDefault
      })

      this.emit('branch-created', branch)
      console.log(`Created branch ${name}`)

      return branch

    } catch (error) {
      console.error(`Failed to create branch ${name}:`, error)
      throw error
    }
  }

  async getBranches(): Promise<VersionBranch[]> {
    try {
      const results = await db.executeQuery(`
        SELECT 
          name, head_version, description, is_default, created_at, last_commit
        FROM version_branches 
        ORDER BY is_default DESC, created_at ASC
      `)

      const branches: VersionBranch[] = []

      for (const result of results) {
        const versions = await this.getBranchVersions(result.name, 10)
        
        branches.push({
          name: result.name,
          headVersion: result.head_version || '',
          description: result.description,
          createdAt: result.created_at,
          lastCommit: result.last_commit,
          isDefault: result.is_default,
          versions
        })
      }

      return branches

    } catch (error) {
      console.error('Failed to get branches:', error)
      throw error
    }
  }

  async createTag(
    version: string,
    tagName: string,
    message?: string,
    createdBy?: string
  ): Promise<VersionTag> {
    try {
      // Check if version exists
      const versionExists = await db.exists(
        'snapshot_versions',
        'version = $1',
        [version]
      )

      if (!versionExists) {
        throw new Error(`Version ${version} not found`)
      }

      // Check if tag already exists
      const tagExists = await db.exists('version_tags', 'name = $1', [tagName])
      if (tagExists) {
        throw new Error(`Tag ${tagName} already exists`)
      }

      const tag: VersionTag = {
        name: tagName,
        version,
        message,
        createdAt: new Date(),
        createdBy
      }

      await db.createRecord('version_tags', {
        name: tag.name,
        version: tag.version,
        message: tag.message,
        created_by: tag.createdBy
      })

      this.emit('tag-created', tag)
      console.log(`Created tag ${tagName} for version ${version}`)

      return tag

    } catch (error) {
      console.error(`Failed to create tag ${tagName}:`, error)
      throw error
    }
  }

  async getTags(limit = 50): Promise<VersionTag[]> {
    try {
      const results = await db.executeQuery(`
        SELECT name, version, message, created_by, created_at
        FROM version_tags 
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit])

      return results.map(result => ({
        name: result.name,
        version: result.version,
        message: result.message,
        createdAt: result.created_at,
        createdBy: result.created_by
      }))

    } catch (error) {
      console.error('Failed to get tags:', error)
      throw error
    }
  }

  async getVersionHistory(version: string): Promise<SnapshotVersion[]> {
    const history: SnapshotVersion[] = []
    let currentVersion = version

    try {
      while (currentVersion) {
        const versionInfo = await this.getVersion(currentVersion)
        if (!versionInfo) {
          break
        }

        history.push(versionInfo)
        currentVersion = versionInfo.parentVersion || ''
      }

      return history

    } catch (error) {
      console.error(`Failed to get version history for ${version}:`, error)
      throw error
    }
  }

  async compareVersions(
    fromVersion: string,
    toVersion: string
  ): Promise<{
    fromSnapshot: NetworkSnapshot
    toSnapshot: NetworkSnapshot
    versionDiff: {
      versionsApart: number
      timespan: number // milliseconds
      intermediateVersions: string[]
    }
  }> {
    const fromSnapshot = await this.getSnapshotByVersion(fromVersion)
    const toSnapshot = await this.getSnapshotByVersion(toVersion)

    if (!fromSnapshot || !toSnapshot) {
      throw new Error('One or both versions not found')
    }

    // Get intermediate versions (simplified - assumes linear history)
    const fromInfo = await this.getVersion(fromVersion)
    const toInfo = await this.getVersion(toVersion)

    const timespan = toInfo!.timestamp.getTime() - fromInfo!.timestamp.getTime()
    
    // For now, return basic comparison info
    return {
      fromSnapshot,
      toSnapshot,
      versionDiff: {
        versionsApart: 1, // Would need proper calculation
        timespan,
        intermediateVersions: []
      }
    }
  }

  async deleteVersion(version: string): Promise<boolean> {
    try {
      const deletedCount = await db.hardDelete(
        'snapshot_versions',
        'version = $1',
        [version]
      )

      if (deletedCount > 0) {
        this.emit('version-deleted', { version })
        console.log(`Deleted version ${version}`)
        return true
      }

      return false

    } catch (error) {
      console.error(`Failed to delete version ${version}:`, error)
      throw error
    }
  }

  async cleanupOldVersions(
    branchName: string,
    keepCount = 50
  ): Promise<number> {
    try {
      // Get versions for branch, ordered by creation date
      const versions = await db.executeQuery(`
        SELECT version
        FROM snapshot_versions 
        WHERE branch_name = $1 AND is_stable = false
        ORDER BY created_at DESC
        OFFSET $2
      `, [branchName, keepCount])

      let deletedCount = 0

      for (const versionRow of versions) {
        try {
          await this.deleteVersion(versionRow.version)
          deletedCount++
        } catch (error) {
          console.warn(`Failed to delete version ${versionRow.version}:`, error)
        }
      }

      if (deletedCount > 0) {
        this.emit('versions-cleaned', {
          branchName,
          deletedCount,
          keepCount
        })
      }

      return deletedCount

    } catch (error) {
      console.error(`Failed to cleanup versions for branch ${branchName}:`, error)
      throw error
    }
  }

  private generateVersionId(branch: string): string {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)
    const random = Math.random().toString(36).substr(2, 5)
    return `${branch}-${timestamp}-${random}`
  }

  private async updateBranchHead(branchName: string, version: string): Promise<void> {
    await db.updateById(
      'version_branches',
      branchName,
      {
        head_version: version,
        last_commit: new Date()
      },
      'name'
    )
  }

  getConfig(): VersioningConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<VersioningConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.emit('config-updated', this.config)
  }
}