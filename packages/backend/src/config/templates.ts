import { AppConfig } from './schema.js'

export const defaultConfigTemplate = {
  json: `{
  "environment": "development",
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "nmapper",
    "username": "nmapper",
    "password": "nmapper",
    "poolSize": 10,
    "ssl": false
  },
  "scan": {
    "interval": 300000,
    "timeout": 30000,
    "maxRetries": 2,
    "defaultNetworkRange": "192.168.1.0/24",
    "defaultPortRange": "1-1000",
    "nmapPath": "nmap",
    "maxConcurrentScans": 1,
    "enableServiceDetection": true,
    "enableOSDetection": true,
    "enableScriptScan": false
  },
  "webUI": {
    "port": 3000,
    "apiPort": 8080,
    "refreshInterval": 30000,
    "pageSize": 25,
    "enableAutoRefresh": true,
    "theme": "auto",
    "showAdvancedOptions": false
  },
  "logging": {
    "level": "info",
    "enableConsole": true,
    "enableFile": true,
    "filePath": "./logs/nmapper.log",
    "maxFileSize": "10MB",
    "maxFiles": 5,
    "enableRotation": true,
    "timestampFormat": "YYYY-MM-DD HH:mm:ss"
  },
  "api": {
    "requestTimeout": 30000,
    "rateLimit": 100,
    "bodySizeLimit": "10mb",
    "cors": {
      "enabled": true,
      "origin": "*",
      "methods": ["GET", "POST", "PUT", "DELETE"],
      "allowedHeaders": ["Content-Type", "Authorization"]
    },
    "auth": {
      "enabled": false,
      "tokenExpiration": 86400000
    }
  },
  "monitoring": {
    "snapshotRetentionDays": 30,
    "enableChangeNotifications": true,
    "changeDetectionSensitivity": "medium",
    "alertThresholds": {
      "newDevices": 5,
      "newPorts": 10,
      "deviceOffline": 3
    },
    "autoBackup": {
      "enabled": true,
      "intervalHours": 24,
      "path": "./backups",
      "maxBackups": 7
    }
  },
  "notifications": {
    "enabled": false,
    "channels": {
      "email": {
        "enabled": false,
        "smtp": {
          "host": "",
          "port": 587,
          "secure": false,
          "username": "",
          "password": ""
        },
        "from": "",
        "to": []
      },
      "webhook": {
        "enabled": false,
        "url": "",
        "headers": {},
        "timeout": 5000
      },
      "slack": {
        "enabled": false,
        "webhookUrl": "",
        "channel": "",
        "username": "NMapper Bot"
      }
    }
  }
}`,

  yaml: `# NMapper Configuration File
# This file contains all configuration options for the NMapper network monitoring system

# Application environment (development, production, test)
environment: development

# Database configuration
database:
  host: localhost
  port: 5432
  database: nmapper
  username: nmapper
  password: nmapper
  poolSize: 10
  idleTimeoutMillis: 30000
  connectionTimeoutMillis: 10000
  ssl: false

# Network scanning configuration
scan:
  # Interval between scans in milliseconds (5 minutes = 300000ms)
  interval: 300000
  
  # Scan timeout in milliseconds (30 seconds = 30000ms)
  timeout: 30000
  
  # Maximum number of retries for failed scans
  maxRetries: 2
  
  # Default network range to scan (CIDR notation)
  defaultNetworkRange: "192.168.1.0/24"
  
  # Default port range to scan
  defaultPortRange: "1-1000"
  
  # Path to nmap executable
  nmapPath: "nmap"
  
  # Maximum number of concurrent scans
  maxConcurrentScans: 1
  
  # Enable service version detection
  enableServiceDetection: true
  
  # Enable OS detection
  enableOSDetection: true
  
  # Enable script scanning (can be slow and intrusive)
  enableScriptScan: false
  
  # Custom nmap options (optional)
  # customNmapOptions: "--min-rate 1000"

# Web UI configuration
webUI:
  # Port for the web interface
  port: 3000
  
  # Port for the API server
  apiPort: 8080
  
  # Auto-refresh interval for the UI in milliseconds
  refreshInterval: 30000
  
  # Number of items per page in lists
  pageSize: 25
  
  # Enable automatic refresh of data
  enableAutoRefresh: true
  
  # UI theme (light, dark, auto)
  theme: auto
  
  # Show advanced configuration options in UI
  showAdvancedOptions: false

# Logging configuration
logging:
  # Log level (error, warn, info, debug, trace)
  level: info
  
  # Enable console logging
  enableConsole: true
  
  # Enable file logging
  enableFile: true
  
  # Path to log file
  filePath: "./logs/nmapper.log"
  
  # Maximum log file size
  maxFileSize: "10MB"
  
  # Maximum number of log files to keep
  maxFiles: 5
  
  # Enable log file rotation
  enableRotation: true
  
  # Timestamp format for log entries
  timestampFormat: "YYYY-MM-DD HH:mm:ss"

# API configuration
api:
  # Request timeout in milliseconds
  requestTimeout: 30000
  
  # Rate limit (requests per minute)
  rateLimit: 100
  
  # Maximum request body size
  bodySizeLimit: "10mb"
  
  # CORS configuration
  cors:
    enabled: true
    origin: "*"
    methods: ["GET", "POST", "PUT", "DELETE"]
    allowedHeaders: ["Content-Type", "Authorization"]
  
  # Authentication configuration
  auth:
    enabled: false
    # secretKey: "your-secret-key-here"
    tokenExpiration: 86400000  # 24 hours in milliseconds

# Monitoring and change detection configuration
monitoring:
  # Number of days to retain snapshots
  snapshotRetentionDays: 30
  
  # Enable notifications for network changes
  enableChangeNotifications: true
  
  # Sensitivity for change detection (low, medium, high)
  changeDetectionSensitivity: medium
  
  # Alert thresholds
  alertThresholds:
    newDevices: 5          # Alert when more than 5 new devices are found
    newPorts: 10           # Alert when more than 10 new ports are found
    deviceOffline: 3       # Alert when device is offline for 3 consecutive scans
  
  # Automatic backup configuration
  autoBackup:
    enabled: true
    intervalHours: 24      # Backup every 24 hours
    path: "./backups"
    maxBackups: 7          # Keep last 7 backups

# Notification configuration
notifications:
  enabled: false
  
  channels:
    # Email notifications
    email:
      enabled: false
      smtp:
        host: ""
        port: 587
        secure: false      # Use TLS
        username: ""
        password: ""
      from: "nmapper@your-domain.com"
      to: []
    
    # Webhook notifications
    webhook:
      enabled: false
      url: ""
      headers: {}
      timeout: 5000
    
    # Slack notifications
    slack:
      enabled: false
      webhookUrl: ""
      channel: "#network-monitoring"
      username: "NMapper Bot"
`
}

export function generateConfigFile(config: AppConfig, format: 'json' | 'yaml' = 'json'): string {
  if (format === 'json') {
    return JSON.stringify(config, null, 2)
  }
  
  // For YAML, we'll need to implement a simple converter or use a library
  // For now, return the template with values replaced
  return defaultConfigTemplate.yaml
}

export function generateEnvironmentTemplate(): string {
  return `# NMapper Environment Configuration
# Copy this file to .env and customize the values

# Database Configuration
NMAPPER_DB_HOST=localhost
NMAPPER_DB_PORT=5432
NMAPPER_DB_NAME=nmapper
NMAPPER_DB_USER=nmapper
NMAPPER_DB_PASSWORD=nmapper
NMAPPER_DB_POOL_SIZE=10
NMAPPER_DB_SSL=false

# Scanning Configuration
NMAPPER_SCAN_INTERVAL=300000
NMAPPER_SCAN_TIMEOUT=30000
NMAPPER_SCAN_MAX_RETRIES=2
NMAPPER_DEFAULT_NETWORK_RANGE=192.168.1.0/24
NMAPPER_DEFAULT_PORT_RANGE=1-1000
NMAPPER_NMAP_PATH=nmap
NMAPPER_MAX_CONCURRENT_SCANS=1
NMAPPER_ENABLE_SERVICE_DETECTION=true
NMAPPER_ENABLE_OS_DETECTION=true
NMAPPER_ENABLE_SCRIPT_SCAN=false

# Web UI Configuration
NMAPPER_WEB_PORT=3000
NMAPPER_API_PORT=8080
NMAPPER_REFRESH_INTERVAL=30000
NMAPPER_PAGE_SIZE=25
NMAPPER_ENABLE_AUTO_REFRESH=true
NMAPPER_THEME=auto
NMAPPER_SHOW_ADVANCED_OPTIONS=false

# Logging Configuration
NMAPPER_LOG_LEVEL=info
NMAPPER_LOG_CONSOLE=true
NMAPPER_LOG_FILE=true
NMAPPER_LOG_FILE_PATH=./logs/nmapper.log
NMAPPER_LOG_MAX_FILE_SIZE=10MB
NMAPPER_LOG_MAX_FILES=5
NMAPPER_LOG_ROTATION=true

# API Configuration
NMAPPER_API_REQUEST_TIMEOUT=30000
NMAPPER_API_RATE_LIMIT=100
NMAPPER_API_BODY_SIZE_LIMIT=10mb
NMAPPER_API_CORS_ENABLED=true
NMAPPER_API_CORS_ORIGIN=*
NMAPPER_API_AUTH_ENABLED=false
# NMAPPER_API_AUTH_SECRET=your-secret-key-here

# Monitoring Configuration
NMAPPER_SNAPSHOT_RETENTION_DAYS=30
NMAPPER_ENABLE_CHANGE_NOTIFICATIONS=true
NMAPPER_CHANGE_DETECTION_SENSITIVITY=medium
NMAPPER_AUTO_BACKUP_ENABLED=true
NMAPPER_AUTO_BACKUP_INTERVAL=24
NMAPPER_BACKUP_PATH=./backups

# Notification Configuration
NMAPPER_NOTIFICATIONS_ENABLED=false

# Email Notifications
NMAPPER_EMAIL_ENABLED=false
# NMAPPER_SMTP_HOST=smtp.gmail.com
# NMAPPER_SMTP_PORT=587
# NMAPPER_SMTP_USER=your-email@gmail.com
# NMAPPER_SMTP_PASSWORD=your-password
# NMAPPER_EMAIL_FROM=nmapper@your-domain.com
# NMAPPER_EMAIL_TO=admin@your-domain.com,security@your-domain.com

# Webhook Notifications
NMAPPER_WEBHOOK_ENABLED=false
# NMAPPER_WEBHOOK_URL=https://your-webhook-url.com/notify

# Slack Notifications
NMAPPER_SLACK_ENABLED=false
# NMAPPER_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
# NMAPPER_SLACK_CHANNEL=#network-monitoring
`
}

export const configFileComments = {
  database: 'Database connection settings for PostgreSQL',
  scan: 'Network scanning configuration including intervals and nmap settings',
  webUI: 'Web interface and API server configuration',
  logging: 'Application logging configuration',
  api: 'REST API configuration including CORS and authentication',
  monitoring: 'Network monitoring and change detection settings',
  notifications: 'Notification channels for network changes and alerts',
}