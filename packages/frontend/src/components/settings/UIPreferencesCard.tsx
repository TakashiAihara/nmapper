import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui'
import { useUIPreferences, useUIPreferencesUpdate } from '@/hooks'
import { LoadingState } from '@/components/common'
import { cn } from '@/lib/utils'
import {
  Palette,
  Monitor,
  Moon,
  Sun,
  Eye,
  Layout,
  Zap,
  Bell,
  Volume2,
  VolumeX,
  Save,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Globe,
  Clock,
  Database,
  Activity,
  Filter,
  Search,
  Grid,
  List,
  BarChart3
} from 'lucide-react'

interface UIPreferences {
  theme: 'light' | 'dark' | 'system'
  density: 'compact' | 'normal' | 'comfortable'
  language: string
  dateFormat: 'relative' | 'absolute' | 'both'
  timeFormat: '12h' | '24h'
  timezone: string
  
  // Dashboard preferences
  defaultDashboardView: 'grid' | 'list' | 'cards'
  autoRefreshInterval: number // seconds
  enableAutoRefresh: boolean
  showWelcomeMessage: boolean
  
  // Table preferences
  defaultPageSize: number
  enableStickyHeaders: boolean
  showRowNumbers: boolean
  compactTables: boolean
  
  // Notifications
  enableNotifications: boolean
  enableSoundNotifications: boolean
  notificationPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  showNotificationPreviews: boolean
  
  // Visualization preferences
  chartAnimations: boolean
  colorScheme: 'default' | 'colorblind' | 'high-contrast'
  showTooltips: boolean
  enableDataLabels: boolean
  
  // Performance preferences
  enableVirtualization: boolean
  lazyLoadImages: boolean
  reducedMotion: boolean
  preloadData: boolean
  
  // Accessibility
  fontSize: 'small' | 'normal' | 'large'
  highContrast: boolean
  screenReaderOptimizations: boolean
  keyboardNavigation: boolean
}

interface UIPreferencesCardProps {
  onPreferencesChange?: (preferences: Partial<UIPreferences>) => void
  className?: string
}

export function UIPreferencesCard({ onPreferencesChange, className }: UIPreferencesCardProps) {
  const { data: currentPreferences, isLoading, error } = useUIPreferences()
  const { updatePreferences, isUpdating } = useUIPreferencesUpdate()
  
  const [preferences, setPreferences] = useState<UIPreferences>({
    theme: 'system',
    density: 'normal',
    language: 'en-US',
    dateFormat: 'relative',
    timeFormat: '12h',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    
    defaultDashboardView: 'grid',
    autoRefreshInterval: 30,
    enableAutoRefresh: true,
    showWelcomeMessage: true,
    
    defaultPageSize: 25,
    enableStickyHeaders: true,
    showRowNumbers: false,
    compactTables: false,
    
    enableNotifications: true,
    enableSoundNotifications: false,
    notificationPosition: 'top-right',
    showNotificationPreviews: true,
    
    chartAnimations: true,
    colorScheme: 'default',
    showTooltips: true,
    enableDataLabels: false,
    
    enableVirtualization: true,
    lazyLoadImages: true,
    reducedMotion: false,
    preloadData: true,
    
    fontSize: 'normal',
    highContrast: false,
    screenReaderOptimizations: false,
    keyboardNavigation: true
  })

  const [hasChanges, setHasChanges] = useState(false)
  const [activeSection, setActiveSection] = useState<'appearance' | 'behavior' | 'performance' | 'accessibility'>('appearance')

  useEffect(() => {
    if (currentPreferences) {
      setPreferences(prev => ({ ...prev, ...currentPreferences }))
    }
  }, [currentPreferences])

  const handlePreferenceChange = (key: string, value: any) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    setHasChanges(true)
    onPreferencesChange?.(newPreferences)
  }

  const handleSave = async () => {
    try {
      await updatePreferences(preferences)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  const handleReset = () => {
    if (currentPreferences) {
      setPreferences(prev => ({ ...prev, ...currentPreferences }))
      setHasChanges(false)
    }
  }

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'behavior', label: 'Behavior', icon: Activity },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'accessibility', label: 'Accessibility', icon: Eye }
  ]

  const languages = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' },
    { value: 'ja-JP', label: 'Japanese' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' }
  ]

  const timezones = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ]

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <LoadingState
          type="card"
          icon="settings"
          title="Loading UI Preferences"
          description="Retrieving user interface settings..."
        />
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>User Interface Preferences</span>
          </CardTitle>
          
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
        </div>

        {/* Section Tabs */}
        <div className="flex space-x-1 mt-4">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Button
                key={section.id}
                variant={activeSection === section.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveSection(section.id as any)}
                className="text-xs"
              >
                <Icon className="h-3 w-3 mr-1" />
                {section.label}
              </Button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 max-h-96 overflow-y-auto">
        {/* Appearance Settings */}
        {activeSection === 'appearance' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Theme & Display</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <div className="flex space-x-2">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor }
                    ].map(({ value, label, icon: Icon }) => (
                      <Button
                        key={value}
                        variant={preferences.theme === value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePreferenceChange('theme', value)}
                        className="flex-1"
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Density</label>
                  <select
                    value={preferences.density}
                    onChange={(e) => handlePreferenceChange('density', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="comfortable">Comfortable</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Font Size</label>
                  <select
                    value={preferences.fontSize}
                    onChange={(e) => handlePreferenceChange('fontSize', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value="small">Small</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Color Scheme</label>
                  <select
                    value={preferences.colorScheme}
                    onChange={(e) => handlePreferenceChange('colorScheme', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value="default">Default</option>
                    <option value="colorblind">Colorblind Friendly</option>
                    <option value="high-contrast">High Contrast</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Localization</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <select
                    value={preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Timezone</label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Format</label>
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value="relative">Relative (2 hours ago)</option>
                    <option value="absolute">Absolute (Dec 25, 2023)</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Format</label>
                  <div className="flex space-x-2">
                    <Button
                      variant={preferences.timeFormat === '12h' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePreferenceChange('timeFormat', '12h')}
                      className="flex-1"
                    >
                      12h
                    </Button>
                    <Button
                      variant={preferences.timeFormat === '24h' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePreferenceChange('timeFormat', '24h')}
                      className="flex-1"
                    >
                      24h
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Behavior Settings */}
        {activeSection === 'behavior' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Dashboard</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default View</label>
                  <div className="flex space-x-2">
                    {[
                      { value: 'grid', icon: Grid },
                      { value: 'list', icon: List },
                      { value: 'cards', icon: BarChart3 }
                    ].map(({ value, icon: Icon }) => (
                      <Button
                        key={value}
                        variant={preferences.defaultDashboardView === value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePreferenceChange('defaultDashboardView', value)}
                        className="flex-1"
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {value}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Auto-refresh Interval</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={preferences.autoRefreshInterval}
                      onChange={(e) => handlePreferenceChange('autoRefreshInterval', parseInt(e.target.value))}
                      min="5"
                      max="300"
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">seconds</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableAutoRefresh"
                    checked={preferences.enableAutoRefresh}
                    onChange={(e) => handlePreferenceChange('enableAutoRefresh', e.target.checked)}
                  />
                  <label htmlFor="enableAutoRefresh" className="text-sm">Enable auto-refresh</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showWelcomeMessage"
                    checked={preferences.showWelcomeMessage}
                    onChange={(e) => handlePreferenceChange('showWelcomeMessage', e.target.checked)}
                  />
                  <label htmlFor="showWelcomeMessage" className="text-sm">Show welcome message</label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Tables & Data</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Page Size</label>
                  <select
                    value={preferences.defaultPageSize}
                    onChange={(e) => handlePreferenceChange('defaultPageSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableStickyHeaders"
                    checked={preferences.enableStickyHeaders}
                    onChange={(e) => handlePreferenceChange('enableStickyHeaders', e.target.checked)}
                  />
                  <label htmlFor="enableStickyHeaders" className="text-sm">Sticky table headers</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showRowNumbers"
                    checked={preferences.showRowNumbers}
                    onChange={(e) => handlePreferenceChange('showRowNumbers', e.target.checked)}
                  />
                  <label htmlFor="showRowNumbers" className="text-sm">Show row numbers</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="compactTables"
                    checked={preferences.compactTables}
                    onChange={(e) => handlePreferenceChange('compactTables', e.target.checked)}
                  />
                  <label htmlFor="compactTables" className="text-sm">Compact table layout</label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Notifications</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Position</label>
                  <select
                    value={preferences.notificationPosition}
                    onChange={(e) => handlePreferenceChange('notificationPosition', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableNotifications"
                    checked={preferences.enableNotifications}
                    onChange={(e) => handlePreferenceChange('enableNotifications', e.target.checked)}
                  />
                  <label htmlFor="enableNotifications" className="text-sm">Enable notifications</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableSoundNotifications"
                    checked={preferences.enableSoundNotifications}
                    onChange={(e) => handlePreferenceChange('enableSoundNotifications', e.target.checked)}
                  />
                  <label htmlFor="enableSoundNotifications" className="text-sm flex items-center space-x-1">
                    {preferences.enableSoundNotifications ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                    <span>Sound notifications</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showNotificationPreviews"
                    checked={preferences.showNotificationPreviews}
                    onChange={(e) => handlePreferenceChange('showNotificationPreviews', e.target.checked)}
                  />
                  <label htmlFor="showNotificationPreviews" className="text-sm">Show notification previews</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Settings */}
        {activeSection === 'performance' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Data Loading</h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableVirtualization"
                    checked={preferences.enableVirtualization}
                    onChange={(e) => handlePreferenceChange('enableVirtualization', e.target.checked)}
                  />
                  <label htmlFor="enableVirtualization" className="text-sm">Enable virtualization for large lists</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="lazyLoadImages"
                    checked={preferences.lazyLoadImages}
                    onChange={(e) => handlePreferenceChange('lazyLoadImages', e.target.checked)}
                  />
                  <label htmlFor="lazyLoadImages" className="text-sm">Lazy load images</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="preloadData"
                    checked={preferences.preloadData}
                    onChange={(e) => handlePreferenceChange('preloadData', e.target.checked)}
                  />
                  <label htmlFor="preloadData" className="text-sm">Preload frequently accessed data</label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Visual Effects</h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="chartAnimations"
                    checked={preferences.chartAnimations}
                    onChange={(e) => handlePreferenceChange('chartAnimations', e.target.checked)}
                  />
                  <label htmlFor="chartAnimations" className="text-sm">Chart animations</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showTooltips"
                    checked={preferences.showTooltips}
                    onChange={(e) => handlePreferenceChange('showTooltips', e.target.checked)}
                  />
                  <label htmlFor="showTooltips" className="text-sm">Show tooltips</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableDataLabels"
                    checked={preferences.enableDataLabels}
                    onChange={(e) => handlePreferenceChange('enableDataLabels', e.target.checked)}
                  />
                  <label htmlFor="enableDataLabels" className="text-sm">Show data labels on charts</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="reducedMotion"
                    checked={preferences.reducedMotion}
                    onChange={(e) => handlePreferenceChange('reducedMotion', e.target.checked)}
                  />
                  <label htmlFor="reducedMotion" className="text-sm">Reduced motion (accessibility)</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accessibility Settings */}
        {activeSection === 'accessibility' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Visual Accessibility</h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="highContrast"
                    checked={preferences.highContrast}
                    onChange={(e) => handlePreferenceChange('highContrast', e.target.checked)}
                  />
                  <label htmlFor="highContrast" className="text-sm">High contrast mode</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="screenReaderOptimizations"
                    checked={preferences.screenReaderOptimizations}
                    onChange={(e) => handlePreferenceChange('screenReaderOptimizations', e.target.checked)}
                  />
                  <label htmlFor="screenReaderOptimizations" className="text-sm">Screen reader optimizations</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="keyboardNavigation"
                    checked={preferences.keyboardNavigation}
                    onChange={(e) => handlePreferenceChange('keyboardNavigation', e.target.checked)}
                  />
                  <label htmlFor="keyboardNavigation" className="text-sm">Enhanced keyboard navigation</label>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Actions */}
      <div className="px-6 py-4 border-t bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {hasChanges ? (
              <>
                <Info className="h-4 w-4" />
                <span>Preferences have unsaved changes</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Preferences saved</span>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
            >
              {isUpdating ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}