# NMapper - LAN Network Monitor

A comprehensive network monitoring system built with Node.js, TypeScript, and React that provides continuous LAN network monitoring with advanced device discovery, change tracking, and Web UI visualization.

## Project Structure

This is a monorepo containing three packages:

```
packages/
├── shared/          # Shared types, schemas, and utilities
├── backend/         # Node.js backend service with nmap integration
└── frontend/        # React frontend with modern UI
```

## Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Start development servers**:
```bash
npm run dev
```

This will start both the backend API server and frontend development server concurrently.

## Development Scripts

- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build all packages
- `npm run test` - Run tests across all packages
- `npm run lint` - Lint all packages
- `npm run typecheck` - Type check all packages

## Package Details

### @nmapper/shared
Shared TypeScript types, Zod schemas, and utility functions used by both backend and frontend.

### @nmapper/backend  
Node.js backend service providing:
- Network scanning with nmap integration
- PostgreSQL database for persistent storage
- Snapshot-based network state tracking
- Change detection and diff generation
- Hono RPC API for frontend communication
- CLI interface for system management

### @nmapper/frontend
Modern React frontend featuring:
- Real-time network visualization
- Device discovery and monitoring
- Interactive network topology maps
- Snapshot comparison and diff views
- Configuration management interface
- Built with Vite, TanStack Router/Query, Zustand, and shadcn/ui

## Prerequisites

- Node.js 18+ 
- npm 9+
- nmap (for network scanning)
- PostgreSQL (for data storage)

## Getting Started

See individual package READMEs for detailed setup instructions:
- [Backend Setup](./packages/backend/README.md)
- [Frontend Setup](./packages/frontend/README.md)

## Architecture

The system follows a modern monorepo architecture with:
- **Shared package** for type safety across frontend/backend
- **Function-based backend services** with dependency injection
- **React frontend** with type-safe RPC communication
- **PostgreSQL** for robust data persistence
- **Comprehensive testing** with Jest and Vitest

## Issues and Development

See our [GitHub Issues](https://github.com/TakashiAihara/nmapper/issues) for the current development roadmap and tasks.

## License

MIT