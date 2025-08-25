import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store'
import { 
  Network,
  History,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Scan
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Monitor },
  { name: 'Current Network', href: '/network/current', icon: Network },
  { name: 'History', href: '/network/history', icon: History },
  { name: 'System Status', href: '/system', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <div
      className={cn(
        'flex flex-col bg-card border-r transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-semibold">NMapper</h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="ml-auto"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            activeProps={{
              className: 'bg-accent text-accent-foreground font-medium'
            }}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>

      {/* Quick Actions */}
      <div className="p-4 border-t space-y-2">
        <Button 
          size={sidebarCollapsed ? 'icon' : 'sm'} 
          className="w-full"
          variant="outline"
        >
          <Scan className="h-4 w-4" />
          {!sidebarCollapsed && <span className="ml-2">Quick Scan</span>}
        </Button>
      </div>
    </div>
  )
}