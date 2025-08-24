// Utility types for enhanced type safety and developer experience

// Make all properties optional except specified ones
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

// Make specified properties optional
export type PartialPick<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Deep partial type
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Make all properties required recursively
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

// Extract array element type
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never

// Create a type that excludes null and undefined
export type NonNullable<T> = T extends null | undefined ? never : T

// Create a union of all possible keys in a type
export type KeysOfUnion<T> = T extends T ? keyof T : never

// Create a type with only the specified keys
export type PickByValue<T, U> = Pick<T, {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]>

// Create a type with only optional properties
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]

// Create a type with only required properties  
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

// Function type utilities
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = 
  T extends (...args: any) => Promise<infer R> ? R : any

export type Parameters<T extends (...args: any) => any> = 
  T extends (...args: infer P) => any ? P : never

// API response wrapper types
export type APIResponse<T> = {
  success: true
  data: T
} | {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type PaginatedData<T> = {
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

// Time-related utility types
export type Timestamp = number // Unix timestamp in milliseconds
export type DateString = string // ISO 8601 date string
export type Duration = number // Duration in milliseconds

// Network-specific utility types
export type IPAddress = string // IPv4 address
export type MACAddress = string // MAC address
export type PortNumber = number // Port number 1-65535
export type CIDR = string // CIDR notation (e.g., "192.168.1.0/24")

// Configuration utility types
export type ConfigValue<T> = T | (() => T) | (() => Promise<T>)

export type Environment = 'development' | 'production' | 'test'

// Event system types
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>

export type EventMap = Record<string, unknown>

export type EventEmitter<T extends EventMap> = {
  on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void
  off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void
  emit<K extends keyof T>(event: K, data: T[K]): void
}

// Database utility types
export type DatabaseRow = Record<string, unknown>
export type QueryResult<T = DatabaseRow> = T[]
export type QueryResultSingle<T = DatabaseRow> = T | null

// Service layer types
export type ServiceMethod<TInput = unknown, TOutput = unknown> = (input: TInput) => Promise<TOutput>

export type ServiceDefinition = Record<string, ServiceMethod>

// Error handling types
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

export type Maybe<T> = T | null | undefined

// Branded types for better type safety
export type Brand<T, TBrand> = T & { __brand: TBrand }

export type DeviceId = Brand<string, 'DeviceId'>
export type SnapshotId = Brand<string, 'SnapshotId'>
export type ScanId = Brand<string, 'ScanId'>

// Conditional types for better inference
export type IsExtends<T, U> = T extends U ? true : false
export type IsEqual<T, U> = T extends U ? U extends T ? true : false : false
export type IsUnion<T> = [T] extends [infer U] ? IsEqual<T, U> extends true ? false : true : false

// Object manipulation utilities
export type Merge<T, U> = Omit<T, keyof U> & U
export type Override<T, U> = Omit<T, keyof U> & U

// Function composition types
export type Compose<F extends (...args: any[]) => any, G extends (...args: any[]) => any> =
  G extends (arg: infer A) => infer B
    ? F extends (arg: B) => infer C
      ? (arg: A) => C
      : never
    : never

// Promise utilities
export type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T
export type PromiseValue<T> = T extends Promise<infer U> ? U : T

// Type guards
export const isString = (value: unknown): value is string => typeof value === 'string'
export const isNumber = (value: unknown): value is number => typeof value === 'number'
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
export const isObject = (value: unknown): value is Record<string, unknown> => 
  typeof value === 'object' && value !== null && !Array.isArray(value)
export const isArray = <T>(value: unknown): value is T[] => Array.isArray(value)
export const isFunction = (value: unknown): value is Function => typeof value === 'function'
export const isNull = (value: unknown): value is null => value === null
export const isUndefined = (value: unknown): value is undefined => value === undefined
export const isNullish = (value: unknown): value is null | undefined => value == null

// Assertion utilities
export const assertExists = <T>(value: T | null | undefined, message?: string): T => {
  if (value == null) {
    throw new Error(message || 'Expected value to exist')
  }
  return value
}

export const assertType = <T>(value: unknown, predicate: (v: unknown) => v is T, message?: string): T => {
  if (!predicate(value)) {
    throw new Error(message || 'Type assertion failed')
  }
  return value
}