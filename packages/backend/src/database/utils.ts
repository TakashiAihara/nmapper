import { PoolClient } from 'pg'
import { database, withConnection, withTransaction, executeQuery, executeQuerySingle } from './connection.js'

export interface QueryOptions {
  timeout?: number
  returnFirst?: boolean
}

export interface PaginationOptions {
  page: number
  limit: number
  offset?: number
}

export interface PaginationResult<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export async function executePaginatedQuery<T>(
  query: string,
  params: any[],
  countQuery: string,
  countParams: any[],
  options: PaginationOptions
): Promise<PaginationResult<T>> {
  const offset = options.offset ?? (options.page - 1) * options.limit
  
  const [items, totalResult] = await Promise.all([
    executeQuery<T>(
      `${query} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, options.limit, offset]
    ),
    executeQuerySingle<{ count: string }>(countQuery, countParams)
  ])

  const total = parseInt(totalResult?.count || '0')
  const totalPages = Math.ceil(total / options.limit)

  return {
    items,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
      hasNext: options.page < totalPages,
      hasPrev: options.page > 1
    }
  }
}

export async function upsertRecord<T>(
  table: string,
  data: Record<string, any>,
  conflictColumns: string[],
  updateColumns?: string[],
  returnColumns: string = '*'
): Promise<T> {
  const columns = Object.keys(data)
  const values = Object.values(data)
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
  
  const updateClause = updateColumns
    ? updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ')
    : columns.filter(col => !conflictColumns.includes(col))
        .map(col => `${col} = EXCLUDED.${col}`).join(', ')

  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT (${conflictColumns.join(', ')})
    ${updateClause ? `DO UPDATE SET ${updateClause}` : 'DO NOTHING'}
    RETURNING ${returnColumns}
  `

  const result = await executeQuerySingle<T>(query, values)
  if (!result) {
    throw new Error(`Failed to upsert record in table ${table}`)
  }
  
  return result
}

export async function batchInsert<T>(
  table: string,
  records: Record<string, any>[],
  onConflict: 'ignore' | 'update' = 'ignore',
  conflictColumns?: string[],
  returnColumns: string = '*'
): Promise<T[]> {
  if (records.length === 0) {
    return []
  }

  const columns = Object.keys(records[0])
  const valueRows: string[] = []
  const allValues: any[] = []
  
  records.forEach((record, recordIndex) => {
    const recordValues = columns.map(col => record[col])
    const placeholders = recordValues.map((_, i) => `$${recordIndex * columns.length + i + 1}`)
    valueRows.push(`(${placeholders.join(', ')})`)
    allValues.push(...recordValues)
  })

  let conflictClause = ''
  if (onConflict === 'ignore') {
    conflictClause = 'ON CONFLICT DO NOTHING'
  } else if (onConflict === 'update' && conflictColumns) {
    const updateClause = columns
      .filter(col => !conflictColumns.includes(col))
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ')
    conflictClause = `ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateClause}`
  }

  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${valueRows.join(', ')}
    ${conflictClause}
    RETURNING ${returnColumns}
  `

  return executeQuery<T>(query, allValues)
}

export async function softDelete(
  table: string,
  whereClause: string,
  params: any[],
  deletedAtColumn: string = 'deleted_at'
): Promise<number> {
  const query = `
    UPDATE ${table} 
    SET ${deletedAtColumn} = NOW() 
    WHERE ${whereClause} AND ${deletedAtColumn} IS NULL
  `
  
  const result = await database.query(query, params)
  return result.rowCount || 0
}

export async function hardDelete(
  table: string,
  whereClause: string,
  params: any[]
): Promise<number> {
  const query = `DELETE FROM ${table} WHERE ${whereClause}`
  const result = await database.query(query, params)
  return result.rowCount || 0
}

export async function exists(
  table: string,
  whereClause: string,
  params: any[]
): Promise<boolean> {
  const query = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${whereClause})`
  const result = await executeQuerySingle<{ exists: boolean }>(query, params)
  return result?.exists || false
}

export async function count(
  table: string,
  whereClause?: string,
  params?: any[]
): Promise<number> {
  const query = whereClause 
    ? `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`
    : `SELECT COUNT(*) as count FROM ${table}`
    
  const result = await executeQuerySingle<{ count: string }>(
    query, 
    params || []
  )
  return parseInt(result?.count || '0')
}

export async function getById<T>(
  table: string,
  id: string,
  idColumn: string = 'id',
  columns: string = '*'
): Promise<T | null> {
  const query = `SELECT ${columns} FROM ${table} WHERE ${idColumn} = $1`
  return executeQuerySingle<T>(query, [id])
}

export async function updateById<T>(
  table: string,
  id: string,
  updates: Record<string, any>,
  idColumn: string = 'id',
  returnColumns: string = '*'
): Promise<T | null> {
  const updateColumns = Object.keys(updates)
  const values = Object.values(updates)
  const setClause = updateColumns.map((col, i) => `${col} = $${i + 2}`).join(', ')
  
  const query = `
    UPDATE ${table} 
    SET ${setClause}, updated_at = NOW()
    WHERE ${idColumn} = $1 
    RETURNING ${returnColumns}
  `
  
  return executeQuerySingle<T>(query, [id, ...values])
}

export async function deleteById(
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<boolean> {
  const deleted = await hardDelete(table, `${idColumn} = $1`, [id])
  return deleted > 0
}

export function buildWhereClause(
  conditions: Record<string, any>,
  startParamIndex: number = 1
): { whereClause: string; params: any[] } {
  const whereConditions: string[] = []
  const params: any[] = []
  let paramIndex = startParamIndex

  Object.entries(conditions).forEach(([column, value]) => {
    if (value === null) {
      whereConditions.push(`${column} IS NULL`)
    } else if (value === undefined) {
      // Skip undefined values
      return
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ')
        whereConditions.push(`${column} IN (${placeholders})`)
        params.push(...value)
      }
    } else if (typeof value === 'object' && value.operator && value.value !== undefined) {
      // Handle operators like { operator: '>=', value: 100 }
      whereConditions.push(`${column} ${value.operator} $${paramIndex++}`)
      params.push(value.value)
    } else {
      whereConditions.push(`${column} = $${paramIndex++}`)
      params.push(value)
    }
  })

  return {
    whereClause: whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1',
    params
  }
}

export async function findMany<T>(
  table: string,
  conditions: Record<string, any> = {},
  options: {
    columns?: string
    orderBy?: string
    limit?: number
    offset?: number
  } = {}
): Promise<T[]> {
  const { whereClause, params } = buildWhereClause(conditions)
  
  let query = `SELECT ${options.columns || '*'} FROM ${table} WHERE ${whereClause}`
  
  if (options.orderBy) {
    query += ` ORDER BY ${options.orderBy}`
  }
  
  if (options.limit) {
    query += ` LIMIT $${params.length + 1}`
    params.push(options.limit)
  }
  
  if (options.offset) {
    query += ` OFFSET $${params.length + 1}`
    params.push(options.offset)
  }
  
  return executeQuery<T>(query, params)
}

export async function findOne<T>(
  table: string,
  conditions: Record<string, any> = {},
  columns: string = '*'
): Promise<T | null> {
  const results = await findMany<T>(table, conditions, { columns, limit: 1 })
  return results[0] || null
}

export async function createRecord<T>(
  table: string,
  data: Record<string, any>,
  returnColumns: string = '*'
): Promise<T> {
  const columns = Object.keys(data)
  const values = Object.values(data)
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
  
  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING ${returnColumns}
  `
  
  const result = await executeQuerySingle<T>(query, values)
  if (!result) {
    throw new Error(`Failed to create record in table ${table}`)
  }
  
  return result
}

export async function bulkUpdate<T>(
  table: string,
  updates: Array<{ id: string; data: Record<string, any> }>,
  idColumn: string = 'id',
  returnColumns: string = '*'
): Promise<T[]> {
  if (updates.length === 0) {
    return []
  }

  return withTransaction(async (client) => {
    const results: T[] = []
    
    for (const update of updates) {
      const result = await updateById<T>(table, update.id, update.data, idColumn, returnColumns)
      if (result) {
        results.push(result)
      }
    }
    
    return results
  })
}

export async function getTableInfo(tableName: string): Promise<{
  columns: Array<{
    column_name: string
    data_type: string
    is_nullable: string
    column_default: string | null
  }>
  indexes: Array<{
    index_name: string
    column_name: string
    is_unique: boolean
  }>
}> {
  const [columns, indexes] = await Promise.all([
    executeQuery<{
      column_name: string
      data_type: string
      is_nullable: string
      column_default: string | null
    }>(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = $1 
       ORDER BY ordinal_position`,
      [tableName]
    ),
    executeQuery<{
      index_name: string
      column_name: string
      is_unique: boolean
    }>(
      `SELECT i.relname as index_name, a.attname as column_name, ix.indisunique as is_unique
       FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
       WHERE t.oid = ix.indrelid
         AND i.oid = ix.indexrelid
         AND a.attrelid = t.oid
         AND a.attnum = ANY(ix.indkey)
         AND t.relkind = 'r'
         AND t.relname = $1`,
      [tableName]
    )
  ])

  return { columns, indexes }
}

export const db = {
  withConnection,
  withTransaction,
  executeQuery,
  executeQuerySingle,
  executePaginatedQuery,
  upsertRecord,
  batchInsert,
  softDelete,
  hardDelete,
  exists,
  count,
  getById,
  updateById,
  deleteById,
  findMany,
  findOne,
  createRecord,
  bulkUpdate,
  buildWhereClause,
  getTableInfo
}