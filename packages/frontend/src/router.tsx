import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Layout } from './components/layout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from './components/ui'

// Root layout component
function RootLayout() {
  return (
    <>
      <Layout>
        <Outlet />
      </Layout>
      <TanStackRouterDevtools />
    </>
  )
}

// Dashboard component
function Dashboard() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your network monitoring system
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Current Network</CardTitle>
            <CardDescription>
              View current network status and devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="success">24 devices online</Badge>
              <Button size="sm" variant="ghost">View →</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Network History</CardTitle>
            <CardDescription>
              Browse historical network snapshots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">156 snapshots</Badge>
              <Button size="sm" variant="ghost">View →</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
            <CardDescription>
              Monitor system health and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="success">Healthy</Badge>
              <Button size="sm" variant="ghost">View →</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Network current page
function NetworkCurrent() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Current Network Status</h1>
      <p className="text-muted-foreground">Real-time view of network devices</p>
    </div>
  )
}

// Network history page
function NetworkHistory() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Network History</h1>
      <p className="text-muted-foreground">Historical network snapshots and changes</p>
    </div>
  )
}

// System status page
function SystemStatus() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">System Status</h1>
      <p className="text-muted-foreground">System health and performance metrics</p>
    </div>
  )
}

// Settings page
function Settings() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <p className="text-muted-foreground">Configure NMapper settings</p>
    </div>
  )
}

// Create root route
const rootRoute = createRootRoute({
  component: RootLayout,
})

// Create route tree
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
})

const networkCurrentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/network/current',
  component: NetworkCurrent,
})

const networkHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/network/history',
  component: NetworkHistory,
})

const systemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/system',
  component: SystemStatus,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
})

// Create router tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  networkCurrentRoute,
  networkHistoryRoute,
  systemRoute,
  settingsRoute,
])

// Create router instance
export const router = createRouter({ routeTree })

// Declare router for TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}