// Application constants

// Network scanning constants
export const NETWORK_CONSTANTS = {
  DEFAULT_SCAN_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MIN_SCAN_INTERVAL: 30 * 1000, // 30 seconds
  MAX_SCAN_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  
  DEFAULT_PORT_RANGE: '1-1000',
  COMMON_PORTS: '22,80,443,3389,5432,3306,6379,27017',
  ALL_PORTS: '1-65535',
  
  DEFAULT_TIMEOUT: 30 * 1000, // 30 seconds
  MIN_TIMEOUT: 5 * 1000, // 5 seconds
  MAX_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  
  DEFAULT_MAX_RETRIES: 2,
  MAX_MAX_RETRIES: 5,
} as const

// Database constants
export const DATABASE_CONSTANTS = {
  DEFAULT_POOL_SIZE: 10,
  MIN_POOL_SIZE: 1,
  MAX_POOL_SIZE: 50,
  
  DEFAULT_SNAPSHOT_RETENTION_DAYS: 30,
  MIN_SNAPSHOT_RETENTION_DAYS: 1,
  MAX_SNAPSHOT_RETENTION_DAYS: 365,
  
  DEFAULT_BACKUP_INTERVAL_HOURS: 24,
  MIN_BACKUP_INTERVAL_HOURS: 1,
  MAX_BACKUP_INTERVAL_HOURS: 24 * 7, // 1 week
} as const

// Web UI constants
export const WEB_UI_CONSTANTS = {
  DEFAULT_PORT: 3000,
  DEFAULT_API_PORT: 8080,
  MIN_PORT: 1024,
  MAX_PORT: 65535,
  
  DEFAULT_REFRESH_INTERVAL: 30 * 1000, // 30 seconds
  MIN_REFRESH_INTERVAL: 5 * 1000, // 5 seconds
  MAX_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  
  DEFAULT_PAGE_SIZE: 25,
  MIN_PAGE_SIZE: 5,
  MAX_PAGE_SIZE: 100,
} as const

// Logging constants
export const LOGGING_CONSTANTS = {
  DEFAULT_LEVEL: 'info',
  DEFAULT_MAX_FILE_SIZE: '10MB',
  DEFAULT_MAX_FILES: 5,
  MIN_MAX_FILES: 1,
  MAX_MAX_FILES: 50,
  
  LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
  },
} as const

// API constants
export const API_CONSTANTS = {
  DEFAULT_REQUEST_TIMEOUT: 30 * 1000, // 30 seconds
  MAX_REQUEST_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  
  DEFAULT_RATE_LIMIT: 100, // requests per minute
  MAX_RATE_LIMIT: 1000,
  
  DEFAULT_BODY_SIZE_LIMIT: '10mb',
  MAX_BODY_SIZE_LIMIT: '50mb',
} as const

// Validation constants
export const VALIDATION_CONSTANTS = {
  IP_REGEX: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  MAC_REGEX: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  CIDR_REGEX: /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/,
  PORT_RANGE_REGEX: /^\d+(-\d+)?(,\d+(-\d+)?)*$/,
  
  MIN_HOSTNAME_LENGTH: 1,
  MAX_HOSTNAME_LENGTH: 253,
  MAX_SERVICE_NAME_LENGTH: 100,
  MAX_ERROR_MESSAGE_LENGTH: 1000,
} as const

// Device categorization constants
export const DEVICE_CATEGORIES = {
  SERVER: 'server',
  WORKSTATION: 'workstation',
  MOBILE: 'mobile',
  IOT: 'iot',
  NETWORK: 'network',
  UNKNOWN: 'unknown',
} as const

// Risk level constants
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const

// Change type constants
export const CHANGE_TYPES = {
  DEVICE_JOINED: 'device_joined',
  DEVICE_LEFT: 'device_left',
  DEVICE_CHANGED: 'device_changed',
  DEVICE_INACTIVE: 'device_inactive',
  PORT_OPENED: 'port_opened',
  PORT_CLOSED: 'port_closed',
  SERVICE_CHANGED: 'service_changed',
  OS_CHANGED: 'os_changed',
} as const

// Port state constants
export const PORT_STATES = {
  OPEN: 'open',
  CLOSED: 'closed',
  FILTERED: 'filtered',
} as const

// Protocol constants
export const PROTOCOLS = {
  TCP: 'tcp',
  UDP: 'udp',
} as const

// Scan type constants
export const SCAN_TYPES = {
  SYN: 'syn',
  CONNECT: 'connect',
  UDP: 'udp',
  COMPREHENSIVE: 'comprehensive',
} as const

// Well-known ports and services
export const WELL_KNOWN_PORTS = {
  FTP: 21,
  SSH: 22,
  TELNET: 23,
  SMTP: 25,
  DNS: 53,
  HTTP: 80,
  POP3: 110,
  IMAP: 143,
  SNMP: 161,
  HTTPS: 443,
  SMTPS: 465,
  IMAPS: 993,
  POP3S: 995,
  MYSQL: 3306,
  RDP: 3389,
  POSTGRESQL: 5432,
  REDIS: 6379,
  HTTP_ALT: 8080,
  HTTPS_ALT: 8443,
  MONGODB: 27017,
} as const

// Common service names
export const COMMON_SERVICES = {
  [WELL_KNOWN_PORTS.FTP]: 'ftp',
  [WELL_KNOWN_PORTS.SSH]: 'ssh',
  [WELL_KNOWN_PORTS.TELNET]: 'telnet',
  [WELL_KNOWN_PORTS.SMTP]: 'smtp',
  [WELL_KNOWN_PORTS.DNS]: 'dns',
  [WELL_KNOWN_PORTS.HTTP]: 'http',
  [WELL_KNOWN_PORTS.POP3]: 'pop3',
  [WELL_KNOWN_PORTS.IMAP]: 'imap',
  [WELL_KNOWN_PORTS.SNMP]: 'snmp',
  [WELL_KNOWN_PORTS.HTTPS]: 'https',
  [WELL_KNOWN_PORTS.SMTPS]: 'smtps',
  [WELL_KNOWN_PORTS.IMAPS]: 'imaps',
  [WELL_KNOWN_PORTS.POP3S]: 'pop3s',
  [WELL_KNOWN_PORTS.MYSQL]: 'mysql',
  [WELL_KNOWN_PORTS.RDP]: 'rdp',
  [WELL_KNOWN_PORTS.POSTGRESQL]: 'postgresql',
  [WELL_KNOWN_PORTS.REDIS]: 'redis',
  [WELL_KNOWN_PORTS.HTTP_ALT]: 'http',
  [WELL_KNOWN_PORTS.HTTPS_ALT]: 'https',
  [WELL_KNOWN_PORTS.MONGODB]: 'mongodb',
} as const

// Error codes
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_IP: 'INVALID_IP',
  INVALID_PORT: 'INVALID_PORT',
  INVALID_MAC: 'INVALID_MAC',
  INVALID_UUID: 'INVALID_UUID',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  NMAP_NOT_FOUND: 'NMAP_NOT_FOUND',
  NMAP_EXECUTION_ERROR: 'NMAP_EXECUTION_ERROR',
  SCAN_TIMEOUT: 'SCAN_TIMEOUT',
  SCAN_FAILED: 'SCAN_FAILED',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  QUERY_ERROR: 'QUERY_ERROR',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  MIGRATION_ERROR: 'MIGRATION_ERROR',
  
  // System errors
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  
  // API errors
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
} as const

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const