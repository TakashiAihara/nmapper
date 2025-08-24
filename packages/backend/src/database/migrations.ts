import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { database, withTransaction, executeQuerySingle } from './connection.js'

export interface Migration {
  version: string
  name: string
  filename: string
  sql: string
  checksum: string
}

export interface MigrationRecord {
  version: string
  name: string
  filename: string
  checksum: string
  applied_at: Date
}

export class MigrationManager {
  private migrationsPath: string

  constructor(migrationsPath: string = join(process.cwd(), 'src/database/migrations')) {
    this.migrationsPath = migrationsPath
  }

  async initializeMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);
    `
    
    await database.query(createTableQuery)
    console.log('Schema migrations table initialized')
  }

  async loadMigrationFiles(): Promise<Migration[]> {
    try {
      const files = await readdir(this.migrationsPath)
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort()

      const migrations: Migration[] = []

      for (const filename of migrationFiles) {
        const match = filename.match(/^(\d+)_(.+)\.sql$/)
        if (!match) {
          console.warn(`Invalid migration filename format: ${filename}`)
          continue
        }

        const [, version, name] = match
        const filePath = join(this.migrationsPath, filename)
        const sql = await readFile(filePath, 'utf-8')
        const checksum = await this.calculateChecksum(sql)

        migrations.push({
          version,
          name: name.replace(/_/g, ' '),
          filename,
          sql,
          checksum
        })
      }

      return migrations
    } catch (error) {
      console.error('Error loading migration files:', error)
      return []
    }
  }

  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    const query = `
      SELECT version, name, filename, checksum, applied_at 
      FROM schema_migrations 
      ORDER BY version
    `
    
    const result = await database.query(query)
    return result.rows
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const allMigrations = await this.loadMigrationFiles()
    const appliedMigrations = await this.getAppliedMigrations()
    const appliedVersions = new Set(appliedMigrations.map(m => m.version))

    return allMigrations.filter(migration => !appliedVersions.has(migration.version))
  }

  async validateMigrations(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = []
    const allMigrations = await this.loadMigrationFiles()
    const appliedMigrations = await this.getAppliedMigrations()

    for (const appliedMigration of appliedMigrations) {
      const currentMigration = allMigrations.find(m => m.version === appliedMigration.version)
      
      if (!currentMigration) {
        issues.push(`Applied migration ${appliedMigration.version} not found in migration files`)
        continue
      }

      if (currentMigration.checksum !== appliedMigration.checksum) {
        issues.push(
          `Checksum mismatch for migration ${appliedMigration.version}: ` +
          `expected ${appliedMigration.checksum}, got ${currentMigration.checksum}`
        )
      }

      if (currentMigration.filename !== appliedMigration.filename) {
        issues.push(
          `Filename mismatch for migration ${appliedMigration.version}: ` +
          `expected ${appliedMigration.filename}, got ${currentMigration.filename}`
        )
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  async runMigrations(dryRun: boolean = false): Promise<{
    migrationsRun: number
    errors: string[]
  }> {
    const pendingMigrations = await this.getPendingMigrations()
    const errors: string[] = []
    let migrationsRun = 0

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found')
      return { migrationsRun: 0, errors: [] }
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`)

    for (const migration of pendingMigrations) {
      try {
        console.log(`${dryRun ? '[DRY RUN] ' : ''}Running migration: ${migration.version} - ${migration.name}`)

        if (!dryRun) {
          await withTransaction(async (client) => {
            await client.query(migration.sql)
            
            await client.query(
              `INSERT INTO schema_migrations (version, name, filename, checksum) 
               VALUES ($1, $2, $3, $4)`,
              [migration.version, migration.name, migration.filename, migration.checksum]
            )
          })
        }

        migrationsRun++
        console.log(`${dryRun ? '[DRY RUN] ' : ''}Migration completed: ${migration.version}`)
      } catch (error) {
        const errorMsg = `Failed to run migration ${migration.version}: ${error}`
        console.error(errorMsg)
        errors.push(errorMsg)
        break // Stop on first error to maintain consistency
      }
    }

    return { migrationsRun, errors }
  }

  async rollbackMigration(version: string): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations()
    const migrationToRollback = appliedMigrations.find(m => m.version === version)

    if (!migrationToRollback) {
      throw new Error(`Migration ${version} is not applied`)
    }

    const laterMigrations = appliedMigrations
      .filter(m => m.version > version)
      .sort((a, b) => b.version.localeCompare(a.version))

    if (laterMigrations.length > 0) {
      throw new Error(
        `Cannot rollback migration ${version} because later migrations are applied: ${
          laterMigrations.map(m => m.version).join(', ')
        }`
      )
    }

    await withTransaction(async (client) => {
      await client.query('DELETE FROM schema_migrations WHERE version = $1', [version])
    })

    console.log(`Migration ${version} rolled back successfully`)
  }

  async getMigrationStatus(): Promise<{
    totalMigrations: number
    appliedMigrations: number
    pendingMigrations: number
    lastAppliedMigration?: MigrationRecord
  }> {
    const allMigrations = await this.loadMigrationFiles()
    const appliedMigrations = await this.getAppliedMigrations()
    const pendingMigrations = await this.getPendingMigrations()

    const lastAppliedMigration = appliedMigrations
      .sort((a, b) => b.applied_at.getTime() - a.applied_at.getTime())[0]

    return {
      totalMigrations: allMigrations.length,
      appliedMigrations: appliedMigrations.length,
      pendingMigrations: pendingMigrations.length,
      lastAppliedMigration
    }
  }

  private async calculateChecksum(content: string): Promise<string> {
    const crypto = await import('crypto')
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
  }
}

export async function initializeMigrations(): Promise<MigrationManager> {
  const migrationManager = new MigrationManager()
  await migrationManager.initializeMigrationsTable()
  return migrationManager
}

export async function runPendingMigrations(): Promise<void> {
  const migrationManager = await initializeMigrations()
  
  const validation = await migrationManager.validateMigrations()
  if (!validation.isValid) {
    console.error('Migration validation failed:')
    validation.issues.forEach(issue => console.error(`- ${issue}`))
    throw new Error('Migration validation failed')
  }

  const result = await migrationManager.runMigrations()
  
  if (result.errors.length > 0) {
    console.error('Migration errors:')
    result.errors.forEach(error => console.error(`- ${error}`))
    throw new Error('Some migrations failed')
  }

  console.log(`Successfully ran ${result.migrationsRun} migrations`)
}