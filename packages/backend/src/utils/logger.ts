import { createWriteStream, existsSync, mkdirSync, statSync, readdirSync, unlinkSync } from 'fs'
import { dirname, join, basename, extname } from 'path'
import { format } from 'util'

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  category?: string
  metadata?: Record<string, unknown>
  error?: Error
  requestId?: string
  sessionId?: string
  userId?: string
  component?: string
}

export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  fileConfig?: {
    directory: string
    filename: string
    maxFileSize: number // bytes
    maxFiles: number
    compress: boolean
  }
  format: 'json' | 'text'
  enableColors: boolean
  enableTimestamp: boolean
  categories: string[]
  filters?: {
    exclude?: string[]
    include?: string[]
  }
}

export interface LogRotationConfig {
  maxFileSize: number
  maxFiles: number
  compress: boolean
  archiveOlder: boolean
}

export class Logger {
  private config: LoggerConfig
  private fileStream?: NodeJS.WritableStream
  private currentLogFile?: string
  private logQueue: LogEntry[] = []
  private isShuttingDown = false

  private static instance: Logger | null = null
  private static readonly colors = {
    [LogLevel.ERROR]: '\x1b[31m', // Red
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.INFO]: '\x1b[36m',  // Cyan
    [LogLevel.DEBUG]: '\x1b[35m', // Magenta
    [LogLevel.TRACE]: '\x1b[37m'  // White
  }

  private static readonly colorReset = '\x1b[0m'

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      fileConfig: {
        directory: './logs',
        filename: 'nmapper.log',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        compress: false
      },
      format: 'json',
      enableColors: true,
      enableTimestamp: true,
      categories: [],
      ...config
    }

    this.initializeFileLogging()
    this.setupGracefulShutdown()
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config)
    }
    return Logger.instance
  }

  static createLogger(config?: Partial<LoggerConfig>): Logger {
    return new Logger(config)
  }

  private initializeFileLogging(): void {
    if (!this.config.enableFile || !this.config.fileConfig) {
      return
    }

    try {
      // Create log directory if it doesn't exist
      const logDir = this.config.fileConfig.directory
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true })
      }

      // Generate log filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const baseFilename = basename(this.config.fileConfig.filename, extname(this.config.fileConfig.filename))
      const extension = extname(this.config.fileConfig.filename) || '.log'
      this.currentLogFile = join(logDir, `${baseFilename}-${timestamp}${extension}`)

      // Check if rotation is needed
      this.checkRotation()

      // Create file stream
      this.fileStream = createWriteStream(this.currentLogFile, { flags: 'a' })

      this.fileStream.on('error', (error) => {
        console.error('Log file error:', error)
        this.config.enableFile = false
      })
    } catch (error) {
      console.error('Failed to initialize file logging:', error)
      this.config.enableFile = false
    }
  }

  private checkRotation(): void {
    if (!this.currentLogFile || !this.config.fileConfig) {
      return
    }

    try {
      if (existsSync(this.currentLogFile)) {
        const stats = statSync(this.currentLogFile)
        if (stats.size >= this.config.fileConfig.maxFileSize) {
          this.rotateLogFile()
        }
      }
    } catch (error) {
      console.error('Error checking log rotation:', error)
    }
  }

  private rotateLogFile(): void {
    if (!this.config.fileConfig || !this.currentLogFile) {
      return
    }

    try {
      // Close current stream
      if (this.fileStream) {
        this.fileStream.end()
      }

      // Get list of existing log files
      const logDir = this.config.fileConfig.directory
      const baseFilename = basename(this.config.fileConfig.filename, extname(this.config.fileConfig.filename))
      const extension = extname(this.config.fileConfig.filename) || '.log'

      const logFiles = readdirSync(logDir)
        .filter(file => file.startsWith(baseFilename) && file.endsWith(extension))
        .map(file => ({
          name: file,
          path: join(logDir, file),
          stats: statSync(join(logDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())

      // Remove old files if we exceed maxFiles
      while (logFiles.length >= this.config.fileConfig.maxFiles) {
        const oldestFile = logFiles.pop()
        if (oldestFile) {
          try {
            unlinkSync(oldestFile.path)
            console.log(`Rotated old log file: ${oldestFile.name}`)
          } catch (error) {
            console.error(`Failed to delete old log file ${oldestFile.name}:`, error)
          }
        }
      }

      // Rename current file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const rotatedName = `${baseFilename}-${timestamp}${extension}`
      const rotatedPath = join(logDir, rotatedName)

      // Move current file
      try {
        const fs = require('fs')
        fs.renameSync(this.currentLogFile, rotatedPath)
        console.log(`Log file rotated to: ${rotatedName}`)
      } catch (error) {
        console.error('Failed to rotate log file:', error)
      }

      // Create new log file
      this.initializeFileLogging()
    } catch (error) {
      console.error('Error during log rotation:', error)
    }
  }

  private shouldLog(level: LogLevel, category?: string): boolean {
    // Check log level
    if (level > this.config.level) {
      return false
    }

    // Check category filters
    if (category && this.config.filters) {
      if (this.config.filters.exclude && this.config.filters.exclude.includes(category)) {
        return false
      }
      if (this.config.filters.include && !this.config.filters.include.includes(category)) {
        return false
      }
    }

    return true
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: LogLevel[entry.level],
        message: entry.message,
        category: entry.category,
        metadata: entry.metadata,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined,
        requestId: entry.requestId,
        sessionId: entry.sessionId,
        userId: entry.userId,
        component: entry.component
      })
    } else {
      const timestamp = this.config.enableTimestamp 
        ? `[${entry.timestamp.toISOString()}] `
        : ''
      
      const levelStr = LogLevel[entry.level].padEnd(5)
      const category = entry.category ? ` [${entry.category}]` : ''
      const component = entry.component ? ` {${entry.component}}` : ''
      const requestId = entry.requestId ? ` (${entry.requestId})` : ''
      
      let message = `${timestamp}${levelStr}${category}${component}${requestId}: ${entry.message}`
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        message += ` | ${JSON.stringify(entry.metadata)}`
      }
      
      if (entry.error) {
        message += `\n  Error: ${entry.error.message}`
        if (entry.error.stack) {
          message += `\n  Stack: ${entry.error.stack}`
        }
      }
      
      return message
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) {
      return
    }

    const formatted = this.formatLogEntry(entry)
    
    if (this.config.enableColors && this.config.format === 'text') {
      const color = Logger.colors[entry.level] || ''
      const coloredMessage = `${color}${formatted}${Logger.colorReset}`
      
      if (entry.level <= LogLevel.WARN) {
        console.error(coloredMessage)
      } else {
        console.log(coloredMessage)
      }
    } else {
      if (entry.level <= LogLevel.WARN) {
        console.error(formatted)
      } else {
        console.log(formatted)
      }
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.config.enableFile || !this.fileStream) {
      return
    }

    const formatted = this.formatLogEntry(entry)
    
    try {
      this.fileStream.write(formatted + '\n', (error) => {
        if (error) {
          console.error('Error writing to log file:', error)
          this.config.enableFile = false
        }
      })

      // Check if rotation is needed after writing
      if (this.currentLogFile && this.config.fileConfig) {
        try {
          const stats = statSync(this.currentLogFile)
          if (stats.size >= this.config.fileConfig.maxFileSize) {
            this.rotateLogFile()
          }
        } catch (error) {
          // Ignore stat errors
        }
      }
    } catch (error) {
      console.error('Error writing to log file:', error)
      this.config.enableFile = false
    }
  }

  private log(level: LogLevel, message: string, options: Partial<LogEntry> = {}): void {
    if (!this.shouldLog(level, options.category)) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      ...options
    }

    if (this.isShuttingDown) {
      this.logQueue.push(entry)
      return
    }

    this.writeToConsole(entry)
    this.writeToFile(entry)
  }

  // Public logging methods
  error(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.ERROR, message, options)
  }

  warn(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.WARN, message, options)
  }

  info(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.INFO, message, options)
  }

  debug(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.DEBUG, message, options)
  }

  trace(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.TRACE, message, options)
  }

  // Formatted logging methods
  logf(level: LogLevel, message: string, ...args: unknown[]): void {
    this.log(level, format(message, ...args))
  }

  errorf(message: string, ...args: unknown[]): void {
    this.error(format(message, ...args))
  }

  warnf(message: string, ...args: unknown[]): void {
    this.warn(format(message, ...args))
  }

  infof(message: string, ...args: unknown[]): void {
    this.info(format(message, ...args))
  }

  debugf(message: string, ...args: unknown[]): void {
    this.debug(format(message, ...args))
  }

  tracef(message: string, ...args: unknown[]): void {
    this.trace(format(message, ...args))
  }

  // Scoped logger methods
  withCategory(category: string): ScopedLogger {
    return new ScopedLogger(this, { category })
  }

  withComponent(component: string): ScopedLogger {
    return new ScopedLogger(this, { component })
  }

  withRequestId(requestId: string): ScopedLogger {
    return new ScopedLogger(this, { requestId })
  }

  withMetadata(metadata: Record<string, unknown>): ScopedLogger {
    return new ScopedLogger(this, { metadata })
  }

  // Performance logging
  time(label: string): void {
    console.time(label)
  }

  timeEnd(label: string): void {
    console.timeEnd(label)
  }

  // Configuration methods
  setLevel(level: LogLevel): void {
    this.config.level = level
    this.info(`Log level set to ${LogLevel[level]}`)
  }

  getLevel(): LogLevel {
    return this.config.level
  }

  setCategory(category: string, enabled: boolean): void {
    if (enabled) {
      if (!this.config.categories.includes(category)) {
        this.config.categories.push(category)
      }
    } else {
      this.config.categories = this.config.categories.filter(c => c !== category)
    }
  }

  // Shutdown handling
  private setupGracefulShutdown(): void {
    const shutdown = () => {
      this.isShuttingDown = true
      
      // Flush any queued logs
      for (const entry of this.logQueue) {
        this.writeToConsole(entry)
        this.writeToFile(entry)
      }
      this.logQueue = []

      // Close file stream
      if (this.fileStream) {
        this.fileStream.end()
      }
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    process.on('exit', shutdown)
  }

  async close(): Promise<void> {
    this.isShuttingDown = true
    
    // Process any remaining logs
    for (const entry of this.logQueue) {
      this.writeToConsole(entry)
      this.writeToFile(entry)
    }
    this.logQueue = []

    // Close file stream
    if (this.fileStream) {
      return new Promise((resolve) => {
        this.fileStream!.end(() => {
          resolve()
        })
      })
    }
  }
}

// Scoped logger for maintaining context
export class ScopedLogger {
  constructor(
    private logger: Logger,
    private scope: Partial<LogEntry>
  ) {}

  private mergeScope(options: Partial<LogEntry> = {}): Partial<LogEntry> {
    return {
      ...this.scope,
      ...options,
      metadata: {
        ...this.scope.metadata,
        ...options.metadata
      }
    }
  }

  error(message: string, options: Partial<LogEntry> = {}): void {
    this.logger.error(message, this.mergeScope(options))
  }

  warn(message: string, options: Partial<LogEntry> = {}): void {
    this.logger.warn(message, this.mergeScope(options))
  }

  info(message: string, options: Partial<LogEntry> = {}): void {
    this.logger.info(message, this.mergeScope(options))
  }

  debug(message: string, options: Partial<LogEntry> = {}): void {
    this.logger.debug(message, this.mergeScope(options))
  }

  trace(message: string, options: Partial<LogEntry> = {}): void {
    this.logger.trace(message, this.mergeScope(options))
  }

  withCategory(category: string): ScopedLogger {
    return new ScopedLogger(this.logger, this.mergeScope({ category }))
  }

  withComponent(component: string): ScopedLogger {
    return new ScopedLogger(this.logger, this.mergeScope({ component }))
  }

  withRequestId(requestId: string): ScopedLogger {
    return new ScopedLogger(this.logger, this.mergeScope({ requestId }))
  }

  withMetadata(metadata: Record<string, unknown>): ScopedLogger {
    return new ScopedLogger(this.logger, this.mergeScope({ metadata }))
  }
}

// Create default logger instance
export const logger = Logger.getInstance({
  level: process.env.LOG_LEVEL ? 
    (LogLevel as any)[process.env.LOG_LEVEL.toUpperCase()] || LogLevel.INFO : 
    LogLevel.INFO,
  enableConsole: true,
  enableFile: process.env.NODE_ENV === 'production',
  format: process.env.LOG_FORMAT === 'text' ? 'text' : 'json',
  enableColors: process.env.NO_COLOR ? false : true
})

// Convenience exports
export const log = logger