# NMapper API Server

A comprehensive REST and RPC API server for the NMapper network monitoring system, built with Hono.

## Features

- **REST API Endpoints**: Full REST interface for all operations
- **RPC Interface**: Single endpoint for all operations with method-based routing
- **Batch Operations**: Execute multiple RPC calls in a single request
- **Request Validation**: Comprehensive input validation using Zod schemas
- **Rate Limiting**: Configurable rate limiting with multiple strategies
- **Security Middleware**: Headers, authentication, IP filtering, and request signing
- **Error Handling**: Structured error responses with proper HTTP codes
- **Auto Documentation**: Self-documenting API with `/api` endpoint

## Quick Start

```typescript
import { createMonitoringService } from '@nmapper/backend'
import { createHonoRpcService } from '@nmapper/backend/api'
import { serve } from '@hono/node-server'

// Start monitoring service
const monitoring = createMonitoringService()
await monitoring.start()

// Create API server
const apiServer = createHonoRpcService(monitoring.service, {
  port: 3001,
  enableLogging: true,
  enableMetrics: true
})

// Start HTTP server
serve({
  fetch: apiServer.getApp().fetch,
  port: 3001
})
```

## API Endpoints

### Health & Status
- `GET /health` - System health check
- `GET /metrics` - System metrics
- `GET /api` - API documentation

### Network Data
- `GET /api/network/current` - Current network snapshot
- `GET /api/network/history` - Network history with filtering
- `GET /api/network/devices` - List devices with pagination
- `GET /api/network/devices/:ip` - Get specific device
- `GET /api/network/devices/:ip/history` - Device history
- `GET /api/network/topology` - Network topology
- `GET /api/network/stats` - Network statistics

### Snapshots
- `GET /api/snapshots` - List snapshots with filtering
- `GET /api/snapshots/:id` - Get specific snapshot
- `POST /api/snapshots/compare` - Compare two snapshots
- `GET /api/snapshots/changes` - Recent changes
- `DELETE /api/snapshots/:id` - Delete snapshot
- `GET /api/snapshots/stats` - Snapshot statistics
- `GET /api/snapshots/export` - Export snapshots (JSON/CSV)

### System Control
- `GET /api/system/status` - System status
- `POST /api/system/scan` - Trigger manual scan
- `POST /api/system/control` - System control (start/stop/restart)
- `GET /api/system/logs` - System logs
- `GET /api/system/info` - System information
- `GET /api/system/performance` - Performance metrics
- `GET /api/system/schedules` - Scheduled scans
- `POST /api/system/schedules` - Create scheduled scan

### Configuration
- `GET /api/config` - Get configuration
- `PUT /api/config` - Update configuration
- `GET /api/config/:section` - Get config section
- `PUT /api/config/:section` - Update config section
- `POST /api/config/reset` - Reset to defaults
- `POST /api/config/validate` - Validate configuration
- `GET /api/config/export` - Export configuration
- `POST /api/config/import` - Import configuration

## RPC Interface

### Single RPC Call
```bash
POST /rpc
Content-Type: application/json

{
  "method": "getCurrentNetwork",
  "params": {}
}
```

### Batch RPC Calls
```bash
POST /rpc/batch
Content-Type: application/json

[
  {
    "method": "getCurrentNetwork",
    "params": {}
  },
  {
    "method": "triggerScan",
    "params": {
      "networkRange": "192.168.1.0/24",
      "scanType": "discovery"
    }
  }
]
```

## Available RPC Methods

### Network Methods
- `getCurrentNetwork()` - Get current network snapshot
- `getNetworkHistory({ timeRange?, limit? })` - Get network history
- `getDevice({ ip })` - Get device by IP
- `getDeviceHistory({ ip })` - Get device history

### Snapshot Methods
- `compareSnapshots({ snapshot1, snapshot2 })` - Compare snapshots
- `getRecentChanges({ hours? })` - Get recent changes

### System Methods
- `triggerScan({ networkRange?, scanType?, ports?, timeout? })` - Trigger scan
- `getSystemStatus()` - Get system status

### Config Methods
- `getConfig()` - Get configuration
- `updateConfig({ config })` - Update configuration

## Middleware

### Security
```typescript
import { securityHeaders, apiKeyAuth, ipWhitelist } from '@nmapper/backend/api/middleware'

// Security headers
app.use('*', securityHeaders())

// API key authentication
app.use('/api/*', apiKeyAuth(['your-api-key']))

// IP whitelist
app.use('/admin/*', ipWhitelist(['127.0.0.1', '192.168.1.0/24']))
```

### Rate Limiting
```typescript
import { rateLimit, RateLimitPresets } from '@nmapper/backend/api/middleware'

// Basic rate limiting
app.use('/api/*', rateLimit({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000
}))

// Use presets
app.use('/api/public/*', rateLimit(RateLimitPresets.lenient))
app.use('/api/auth/*', rateLimit(RateLimitPresets.strict))
```

### Validation
```typescript
import { validateJSON, validateQuery, CommonSchemas } from '@nmapper/backend/api/middleware'

// JSON body validation
app.post('/api/scan', validateJSON(z.object({
  networkRange: z.string(),
  scanType: z.enum(['discovery', 'comprehensive', 'quick'])
})))

// Query parameter validation
app.get('/api/devices', validateQuery(CommonSchemas.pagination))
```

## Configuration

```typescript
const server = createHonoRpcService(monitoringService, {
  port: 3001,
  host: '0.0.0.0',
  cors: {
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization']
  },
  enableLogging: true,
  enableMetrics: true,
  rateLimiting: {
    enabled: true,
    maxRequests: 100,
    windowMs: 15 * 60 * 1000
  }
})
```

## Error Handling

The API uses structured error responses:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "fieldErrors": {
    "networkRange": ["Invalid network range format"]
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Access denied
- `RATE_LIMITED` - Rate limit exceeded
- `INTERNAL_ERROR` - Server error

## Integration Examples

### Frontend Integration
```javascript
// RPC client
class NMapperAPI {
  constructor(baseURL) {
    this.baseURL = baseURL
  }

  async rpc(method, params = {}) {
    const response = await fetch(`${this.baseURL}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params })
    })
    return response.json()
  }

  async getCurrentNetwork() {
    return this.rpc('getCurrentNetwork')
  }

  async triggerScan(networkRange, scanType = 'discovery') {
    return this.rpc('triggerScan', { networkRange, scanType })
  }
}
```

### CLI Integration
```bash
# Get system status
curl -X GET http://localhost:3001/api/system/status

# Trigger scan
curl -X POST http://localhost:3001/api/system/scan \\
  -H "Content-Type: application/json" \\
  -d '{"networkRange": "192.168.1.0/24", "scanType": "discovery"}'

# RPC call
curl -X POST http://localhost:3001/rpc \\
  -H "Content-Type: application/json" \\
  -d '{"method": "getCurrentNetwork", "params": {}}'
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Start development server
npm run dev

# Run tests
npm test
```