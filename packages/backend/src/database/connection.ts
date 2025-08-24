import { Pool, PoolClient, PoolConfig } from 'pg'
import { DATABASE_CONSTANTS } from '@nmapper/shared'

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  poolSize?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
  ssl?: boolean
}

export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null
  private pool: Pool | null = null
  private config: DatabaseConfig | null = null

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection()
    }
    return DatabaseConnection.instance
  }

  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.pool) {
      await this.close()
    }

    this.config = config

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      max: config.poolSize || DATABASE_CONSTANTS.DEFAULT_POOL_SIZE,
      min: Math.min(2, config.poolSize || DATABASE_CONSTANTS.DEFAULT_POOL_SIZE),
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    }

    this.pool = new Pool(poolConfig)

    this.pool.on('error', (err) => {
      console.error('Database pool error:', err)
    })

    this.pool.on('connect', (client) => {
      console.log('New database client connected')
    })

    this.pool.on('acquire', (client) => {
      console.log('Database client acquired from pool')
    })

    this.pool.on('remove', (client) => {
      console.log('Database client removed from pool')
    })

    await this.testConnection()
  }

  async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized')
    }

    try {
      const client = await this.pool.connect()
      await client.query('SELECT NOW()')
      client.release()
      console.log('Database connection test successful')
    } catch (error) {
      console.error('Database connection test failed:', error)
      throw error
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not initialized')
    }

    return this.pool.connect()
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not initialized')
    }

    const client = await this.pool.connect()
    try {
      const result = await client.query(text, params)
      return result
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      console.log('Database connection pool closed')
    }
  }

  getPoolStatus() {
    if (!this.pool) {
      return null
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    }
  }

  isInitialized(): boolean {
    return this.pool !== null
  }
}

export const database = DatabaseConnection.getInstance()

export async function withConnection<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await database.getClient()
  try {
    return await operation(client)
  } finally {
    client.release()
  }
}

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withConnection(async (client) => {
    await client.query('BEGIN')
    try {
      const result = await operation(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })
}

export async function executeQuery<T = any>(
  query: string,
  params?: any[]
): Promise<T[]> {
  const result = await database.query(query, params)
  return result.rows
}

export async function executeQuerySingle<T = any>(
  query: string,
  params?: any[]
): Promise<T | null> {
  const result = await database.query(query, params)
  return result.rows[0] || null
}

export async function executeMigration(
  migrationSql: string,
  migrationName: string
): Promise<void> {
  await withTransaction(async (client) => {
    console.log(`Executing migration: ${migrationName}`)
    await client.query(migrationSql)
    console.log(`Migration completed: ${migrationName}`)
  })
}

export function createDatabaseConfig(
  host: string = process.env.DB_HOST || 'localhost',
  port: number = parseInt(process.env.DB_PORT || '5432'),
  database: string = process.env.DB_NAME || 'nmapper',
  username: string = process.env.DB_USER || 'nmapper',
  password: string = process.env.DB_PASSWORD || 'nmapper',
  options: Partial<DatabaseConfig> = {}
): DatabaseConfig {
  return {
    host,
    port,
    database,
    username,
    password,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    ssl: process.env.DB_SSL === 'true',
    ...options,
  }
}