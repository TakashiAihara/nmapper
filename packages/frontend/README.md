# NMapper Frontend

Modern React frontend for the NMapper LAN Network Monitor.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TanStack Router** - Client-side routing
- **TanStack Query** - Server state management
- **Zustand** - Local state management
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **Vitest** - Testing

## Development

Start the development server:

```bash
npm run dev
```

The frontend will be available at http://localhost:3000, with API calls proxied to the backend at http://localhost:8080.

## Architecture

### State Management

- **Server State**: Managed by TanStack Query with caching, background refetching, and error handling
- **Local UI State**: Managed by Zustand stores for UI preferences, filters, and selections
- **Component State**: React state for local component interactions

### Routing

Uses TanStack Router with type-safe routing and file-based route definitions.

### API Integration

- REST API client with proper error handling
- RPC client for batch operations
- TypeScript types shared between frontend and backend

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript compiler
- `npm run lint` - Run ESLint
- `npm run test` - Run tests