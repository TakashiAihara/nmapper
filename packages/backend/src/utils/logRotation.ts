import { createReadStream, createWriteStream, existsSync, statSync, readdirSync, unlinkSync, renameSync } from 'fs'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { join, dirname, basename, extname } from 'path'
import { logger } from './logger.js'

export interface LogRotationConfig {
  directory: string
  filePattern: string // e.g., 'nmapper-*.log'
  maxFileSize: number // bytes
  maxFiles: number
  maxAge: number // days
  compressOld: boolean
  compressionLevel: number // 1-9, 6 is default
  checkInterval: number // milliseconds
  deleteEmptyFiles: boolean
  archiveFormat: 'gzip' | 'none'
  onRotation?: (oldFile: string, newFile: string) => void
  onCleanup?: (deletedFiles: string[]) => void
  onError?: (error: Error) => void
}

export interface LogFileInfo {
  path: string
  name: string
  size: number
  created: Date
  modified: Date
  compressed: boolean
  isActive: boolean
}

export class LogRotationManager {
  private config: LogRotationConfig
  private rotationTimer?: NodeJS.Timeout
  private isRunning = false

  constructor(config: Partial<LogRotationConfig> = {}) {
    this.config = {
      directory: './logs',
      filePattern: '*.log',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      maxAge: 30, // 30 days
      compressOld: true,
      compressionLevel: 6,
      checkInterval: 60 * 1000, // 1 minute
      deleteEmptyFiles: true,
      archiveFormat: 'gzip',
      ...config
    }

    this.validateConfig()
  }

  private validateConfig(): void {
    if (!this.config.directory) {
      throw new Error('Log directory is required')
    }
    
    if (this.config.maxFileSize <= 0) {
      throw new Error('Max file size must be greater than 0')
    }
    
    if (this.config.maxFiles <= 0) {
      throw new Error('Max files must be greater than 0')
    }
    
    if (this.config.maxAge <= 0) {
      throw new Error('Max age must be greater than 0')
    }

    if (this.config.compressionLevel < 1 || this.config.compressionLevel > 9) {
      this.config.compressionLevel = 6
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    
    logger.info('Starting log rotation manager', {
      category: 'logRotation',
      metadata: {
        directory: this.config.directory,
        maxFileSize: this.config.maxFileSize,
        maxFiles: this.config.maxFiles,
        maxAge: this.config.maxAge,
        checkInterval: this.config.checkInterval
      }
    })

    // Initial cleanup
    await this.performMaintenance()

    // Schedule regular maintenance
    this.rotationTimer = setInterval(() => {
      this.performMaintenance().catch(error => {
        logger.error('Error during scheduled log maintenance', {
          category: 'logRotation',
          error
        })
        this.config.onError?.(error)
      })
    }, this.config.checkInterval)
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    if (this.rotationTimer) {
      clearInterval(this.rotationTimer)
      this.rotationTimer = undefined
    }

    logger.info('Log rotation manager stopped', {
      category: 'logRotation'
    })
  }

  async performMaintenance(): Promise<void> {
    try {
      const logFiles = await this.getLogFiles()
      
      // Rotate large files
      await this.rotateOversizedFiles(logFiles)
      
      // Compress old files
      if (this.config.compressOld) {
        await this.compressOldFiles(logFiles)
      }
      
      // Clean up old files
      await this.cleanupOldFiles()
      
      // Delete empty files
      if (this.config.deleteEmptyFiles) {
        await this.deleteEmptyFiles()
      }

      logger.debug('Log maintenance completed', {
        category: 'logRotation',
        metadata: {
          filesProcessed: logFiles.length
        }
      })
    } catch (error) {
      logger.error('Error during log maintenance', {
        category: 'logRotation',
        error: error instanceof Error ? error : new Error(String(error))
      })
      this.config.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  private async getLogFiles(): Promise<LogFileInfo[]> {
    if (!existsSync(this.config.directory)) {
      return []
    }

    try {
      const files = readdirSync(this.config.directory)
      const logFiles: LogFileInfo[] = []

      for (const file of files) {
        if (this.matchesPattern(file)) {
          const filePath = join(this.config.directory, file)
          const stats = statSync(filePath)

          logFiles.push({
            path: filePath,
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            compressed: file.endsWith('.gz'),
            isActive: this.isActiveLogFile(file)
          })
        }
      }

      return logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime())
    } catch (error) {
      logger.error('Error reading log directory', {
        category: 'logRotation',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { directory: this.config.directory }
      })
      return []
    }
  }

  private matchesPattern(filename: string): boolean {
    const pattern = this.config.filePattern.replace(/\*/g, '.*')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(filename) || regex.test(filename.replace(/\.gz$/, ''))
  }

  private isActiveLogFile(filename: string): boolean {
    // Consider a file active if it was modified in the last hour
    // This is a heuristic to avoid rotating currently active log files
    try {
      const filePath = join(this.config.directory, filename)
      const stats = statSync(filePath)
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      return stats.mtime.getTime() > oneHourAgo
    } catch {
      return false
    }
  }

  private async rotateOversizedFiles(logFiles: LogFileInfo[]): Promise<void> {
    for (const file of logFiles) {
      if (file.size > this.config.maxFileSize && !file.compressed && !file.isActive) {
        await this.rotateFile(file)
      }
    }
  }

  private async rotateFile(file: LogFileInfo): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const baseName = basename(file.name, extname(file.name))
      const extension = extname(file.name)
      const rotatedName = `${baseName}-${timestamp}${extension}`
      const rotatedPath = join(this.config.directory, rotatedName)

      // Rename the file
      renameSync(file.path, rotatedPath)

      logger.info('Log file rotated', {
        category: 'logRotation',
        metadata: {
          originalFile: file.name,
          rotatedFile: rotatedName,
          size: file.size
        }
      })

      this.config.onRotation?.(file.path, rotatedPath)
    } catch (error) {
      logger.error('Error rotating log file', {
        category: 'logRotation',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { file: file.name }
      })
    }
  }

  private async compressOldFiles(logFiles: LogFileInfo[]): Promise<void> {
    if (this.config.archiveFormat === 'none') {
      return
    }

    for (const file of logFiles) {
      if (!file.compressed && !file.isActive && this.shouldCompress(file)) {
        await this.compressFile(file)
      }
    }
  }

  private shouldCompress(file: LogFileInfo): boolean {
    // Compress files older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    return file.modified.getTime() < oneHourAgo
  }

  private async compressFile(file: LogFileInfo): Promise<void> {
    if (this.config.archiveFormat !== 'gzip') {
      return
    }

    try {
      const compressedPath = `${file.path}.gz`

      // Create compression stream
      const gzip = createGzip({ level: this.config.compressionLevel })
      
      // Compress the file
      await pipeline(
        createReadStream(file.path),
        gzip,
        createWriteStream(compressedPath)
      )

      // Remove original file after successful compression
      unlinkSync(file.path)

      const originalSize = file.size
      const compressedSize = statSync(compressedPath).size
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1)

      logger.info('Log file compressed', {
        category: 'logRotation',
        metadata: {
          file: file.name,
          originalSize,
          compressedSize,
          compressionRatio: `${compressionRatio}%`,
          savedBytes: originalSize - compressedSize
        }
      })
    } catch (error) {
      logger.error('Error compressing log file', {
        category: 'logRotation',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { file: file.name }
      })
    }
  }

  private async cleanupOldFiles(): Promise<void> {
    const logFiles = await this.getLogFiles()
    const cutoffDate = new Date(Date.now() - (this.config.maxAge * 24 * 60 * 60 * 1000))
    const deletedFiles: string[] = []

    // Sort files by modification time, newest first
    logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime())

    // Delete files that are too old or exceed the maximum count
    for (let i = 0; i < logFiles.length; i++) {
      const file = logFiles[i]
      const shouldDelete = 
        file.modified < cutoffDate || // Too old
        i >= this.config.maxFiles || // Exceeds max files
        file.isActive === false // Not currently active

      if (shouldDelete && !file.isActive) {
        try {
          unlinkSync(file.path)
          deletedFiles.push(file.name)
          
          logger.info('Old log file deleted', {
            category: 'logRotation',
            metadata: {
              file: file.name,
              age: Math.floor((Date.now() - file.modified.getTime()) / (24 * 60 * 60 * 1000)),
              reason: file.modified < cutoffDate ? 'too old' : 'exceeds max files'
            }
          })
        } catch (error) {
          logger.error('Error deleting old log file', {
            category: 'logRotation',
            error: error instanceof Error ? error : new Error(String(error)),
            metadata: { file: file.name }
          })
        }
      }
    }

    if (deletedFiles.length > 0) {
      this.config.onCleanup?.(deletedFiles)
    }
  }

  private async deleteEmptyFiles(): Promise<void> {
    const logFiles = await this.getLogFiles()
    const deletedFiles: string[] = []

    for (const file of logFiles) {
      if (file.size === 0 && !file.isActive) {
        try {
          unlinkSync(file.path)
          deletedFiles.push(file.name)
          
          logger.debug('Empty log file deleted', {
            category: 'logRotation',
            metadata: { file: file.name }
          })
        } catch (error) {
          logger.error('Error deleting empty log file', {
            category: 'logRotation',
            error: error instanceof Error ? error : new Error(String(error)),
            metadata: { file: file.name }
          })
        }
      }
    }

    if (deletedFiles.length > 0) {
      logger.info('Deleted empty log files', {
        category: 'logRotation',
        metadata: { count: deletedFiles.length, files: deletedFiles }
      })
    }
  }

  // Manual operations
  async rotateNow(filename?: string): Promise<void> {
    const logFiles = await this.getLogFiles()
    
    if (filename) {
      const file = logFiles.find(f => f.name === filename)
      if (file) {
        await this.rotateFile(file)
      } else {
        throw new Error(`Log file not found: ${filename}`)
      }
    } else {
      // Rotate all oversized files
      await this.rotateOversizedFiles(logFiles)
    }
  }

  async compressNow(filename?: string): Promise<void> {
    const logFiles = await this.getLogFiles()
    
    if (filename) {
      const file = logFiles.find(f => f.name === filename)
      if (file && !file.compressed) {
        await this.compressFile(file)
      } else if (!file) {
        throw new Error(`Log file not found: ${filename}`)
      } else {
        throw new Error(`Log file is already compressed: ${filename}`)
      }
    } else {
      // Compress all eligible files
      await this.compressOldFiles(logFiles)
    }
  }

  async cleanupNow(): Promise<void> {
    await this.cleanupOldFiles()
  }

  // Information methods
  async getStats(): Promise<{
    totalFiles: number
    totalSize: number
    compressedFiles: number
    oldestFile?: LogFileInfo
    newestFile?: LogFileInfo
    averageFileSize: number
  }> {
    const logFiles = await this.getLogFiles()
    
    if (logFiles.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        compressedFiles: 0,
        averageFileSize: 0
      }
    }

    const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0)
    const compressedFiles = logFiles.filter(f => f.compressed).length
    const oldestFile = logFiles.reduce((oldest, file) => 
      !oldest || file.created < oldest.created ? file : oldest
    )
    const newestFile = logFiles.reduce((newest, file) => 
      !newest || file.created > newest.created ? file : newest
    )

    return {
      totalFiles: logFiles.length,
      totalSize,
      compressedFiles,
      oldestFile,
      newestFile,
      averageFileSize: totalSize / logFiles.length
    }
  }

  async getLogFileList(): Promise<LogFileInfo[]> {
    return this.getLogFiles()
  }

  getConfig(): LogRotationConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<LogRotationConfig>): void {
    this.config = { ...this.config, ...updates }
    this.validateConfig()
    
    logger.info('Log rotation config updated', {
      category: 'logRotation',
      metadata: { updates: Object.keys(updates) }
    })
  }
}

// Create default rotation manager
export const logRotationManager = new LogRotationManager({
  directory: process.env.LOG_DIR || './logs',
  maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
  maxAge: parseInt(process.env.LOG_MAX_AGE_DAYS || '30'),
  compressOld: process.env.LOG_COMPRESS !== 'false',
  checkInterval: parseInt(process.env.LOG_ROTATION_CHECK_INTERVAL || '60000') // 1 minute
})

// Auto-start rotation manager in production
if (process.env.NODE_ENV === 'production') {
  logRotationManager.start().catch(error => {
    console.error('Failed to start log rotation manager:', error)
  })
}

export { logRotationManager as rotationManager }