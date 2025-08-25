import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { useUIStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  Palette,
  Monitor,
  Bell,
  Table,
  Eye,
  Layout,
  Save,
  RotateCcw
} from 'lucide-react'

interface PreferencesFormProps {
  className?: string
}

export function PreferencesForm({ className }: PreferencesFormProps) {
  const {
    theme,
    sidebarCollapsed,
    showDevtools,
    pageSize,
    showNotifications,
    notificationPosition,
    setTheme,
    setSidebarCollapsed,
    setShowDevtools,
    setPageSize,
    setShowNotifications,
    setNotificationPosition,
    reset
  } = useUIStore()

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all preferences to defaults?')) {
      reset()
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>User Preferences</span>
            </CardTitle>
            
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Appearance</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Theme</label>
            <div className="flex space-x-2">
              {[
                { value: 'light', label: 'Light', icon: '☀️' },
                { value: 'dark', label: 'Dark', icon: '🌙' },
                { value: 'system', label: 'System', icon: '💻' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as any)}
                  className={cn(
                    'flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors',
                    theme === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                  )}
                >
                  <span>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Choose your preferred color scheme
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layout className="h-5 w-5" />
            <span>Layout</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Collapsed Sidebar</label>
              <p className="text-xs text-muted-foreground">
                Keep the sidebar collapsed by default
              </p>
            </div>
            <input
              type="checkbox"
              checked={sidebarCollapsed}
              onChange={(e) => setSidebarCollapsed(e.target.checked)}
              className="rounded border-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Show Developer Tools</label>
              <p className="text-xs text-muted-foreground">
                Display development and debugging tools
              </p>
            </div>
            <input
              type="checkbox"
              checked={showDevtools}
              onChange={(e) => setShowDevtools(e.target.checked)}
              className="rounded border-gray-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table & Data Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Table className="h-5 w-5" />
            <span>Data Display</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Items per page</label>
            <div className="flex space-x-2">
              {[10, 25, 50, 100].map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={cn(
                    'px-3 py-2 rounded-md border transition-colors text-sm',
                    pageSize === size
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Number of items to show in tables and lists
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Enable Notifications</label>
              <p className="text-xs text-muted-foreground">
                Show system notifications and alerts
              </p>
            </div>
            <input
              type="checkbox"
              checked={showNotifications}
              onChange={(e) => setShowNotifications(e.target.checked)}
              className="rounded border-gray-300"
            />
          </div>

          {showNotifications && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Notification Position</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'top-right', label: 'Top Right' },
                  { value: 'top-left', label: 'Top Left' },
                  { value: 'bottom-right', label: 'Bottom Right' },
                  { value: 'bottom-left', label: 'Bottom Left' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setNotificationPosition(option.value as any)}
                    className={cn(
                      'px-3 py-2 rounded-md border transition-colors text-sm',
                      notificationPosition === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Where to display notification messages
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy & Data Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Privacy & Data</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Analytics</label>
                <p className="text-xs text-muted-foreground">
                  Help improve the application by sharing usage data
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={false}
                className="rounded border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Crash Reporting</label>
                <p className="text-xs text-muted-foreground">
                  Send error reports to help fix bugs
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={true}
                className="rounded border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Remember Window State</label>
                <p className="text-xs text-muted-foreground">
                  Save window size and position between sessions
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={true}
                className="rounded border-gray-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Hardware Acceleration</label>
                <p className="text-xs text-muted-foreground">
                  Use GPU acceleration for better performance
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={true}
                className="rounded border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Experimental Features</label>
                <p className="text-xs text-muted-foreground">
                  Enable beta features and experimental functionality
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={false}
                className="rounded border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Log Level</label>
              <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info" selected>Info</option>
                <option value="debug">Debug</option>
                <option value="trace">Trace</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Minimum log level to display in console
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Most preferences are saved automatically
            </p>
            
            <Button size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}