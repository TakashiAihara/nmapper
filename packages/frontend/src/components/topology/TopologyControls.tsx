import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Slider } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Move3D,
  Grid3X3,
  Layers,
  Layout,
  Maximize,
  Minimize,
  MoreHorizontal,
  Play,
  Pause,
  SkipBack,
  MousePointer2,
  Hand,
  Square,
  Circle,
  Settings2,
  Eye,
  EyeOff
} from 'lucide-react'

interface TopologyControlsProps {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
  onFitToView?: () => void
  onCenterView?: () => void
  onToggleGrid?: () => void
  onToggleLabels?: () => void
  onToggleAnimation?: () => void
  onLayoutChange?: (layout: 'force' | 'hierarchical' | 'circular' | 'grid') => void
  onInteractionModeChange?: (mode: 'pan' | 'select' | 'zoom') => void
  zoomLevel?: number
  isAnimating?: boolean
  showGrid?: boolean
  showLabels?: boolean
  currentLayout?: 'force' | 'hierarchical' | 'circular' | 'grid'
  interactionMode?: 'pan' | 'select' | 'zoom'
  className?: string
}

export function TopologyControls({
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToView,
  onCenterView,
  onToggleGrid,
  onToggleLabels,
  onToggleAnimation,
  onLayoutChange,
  onInteractionModeChange,
  zoomLevel = 100,
  isAnimating = false,
  showGrid = true,
  showLabels = true,
  currentLayout = 'force',
  interactionMode = 'pan',
  className
}: TopologyControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const layouts = [
    { id: 'force', name: 'Force', icon: Move3D, description: 'Physics-based layout' },
    { id: 'hierarchical', name: 'Tree', icon: Layout, description: 'Hierarchical tree layout' },
    { id: 'circular', name: 'Circular', icon: Circle, description: 'Circular arrangement' },
    { id: 'grid', name: 'Grid', icon: Grid3X3, description: 'Grid alignment' }
  ] as const

  const interactionModes = [
    { id: 'pan', name: 'Pan', icon: Hand, description: 'Pan and navigate' },
    { id: 'select', name: 'Select', icon: MousePointer2, description: 'Select nodes' },
    { id: 'zoom', name: 'Zoom', icon: ZoomIn, description: 'Zoom area' }
  ] as const

  if (!isExpanded) {
    return (
      <div className={cn('space-y-2', className)}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="shadow-lg"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Card className={cn('w-72 shadow-lg', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Settings2 className="h-4 w-4" />
            <span>Topology Controls</span>
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-6 w-6 p-0"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 p-0"
            >
              <Minimize className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Zoom Controls */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Zoom</label>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onZoomOut}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            
            <div className="flex-1 px-2">
              <div className="text-xs text-center mb-1">
                {Math.round(zoomLevel)}%
              </div>
              <Slider
                value={[zoomLevel]}
                min={10}
                max={500}
                step={10}
                className="w-full"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onZoomIn}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomReset}
              className="text-xs h-7"
            >
              Reset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onFitToView}
              className="text-xs h-7"
            >
              Fit All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCenterView}
              className="text-xs h-7"
            >
              Center
            </Button>
          </div>
        </div>

        {/* Interaction Mode */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Interaction</label>
          <div className="grid grid-cols-3 gap-1">
            {interactionModes.map((mode) => (
              <Button
                key={mode.id}
                variant={interactionMode === mode.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => onInteractionModeChange?.(mode.id)}
                className="text-xs h-8"
                title={mode.description}
              >
                <mode.icon className="h-3 w-3" />
              </Button>
            ))}
          </div>
        </div>

        {/* Layout Controls */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Layout</label>
          <div className="grid grid-cols-2 gap-1">
            {layouts.map((layout) => (
              <Button
                key={layout.id}
                variant={currentLayout === layout.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLayoutChange?.(layout.id)}
                className="text-xs h-8 justify-start"
                title={layout.description}
              >
                <layout.icon className="h-3 w-3 mr-1" />
                <span>{layout.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* View Options */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">View Options</label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Grid3X3 className="h-3 w-3" />
                <span className="text-xs">Show Grid</span>
              </div>
              <Button
                variant={showGrid ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleGrid}
                className="h-6 w-12 text-xs"
              >
                {showGrid ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="h-3 w-3" />
                <span className="text-xs">Show Labels</span>
              </div>
              <Button
                variant={showLabels ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleLabels}
                className="h-6 w-12 text-xs"
              >
                {showLabels ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isAnimating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span className="text-xs">Animation</span>
              </div>
              <Button
                variant={isAnimating ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleAnimation}
                className="h-6 w-12 text-xs"
              >
                {isAnimating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Advanced Controls */}
        {showAdvanced && (
          <div className="space-y-2 border-t pt-3">
            <label className="text-xs font-medium text-muted-foreground">Advanced</label>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs">Force Strength</span>
                <div className="w-20">
                  <Slider
                    defaultValue={[50]}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs">Node Distance</span>
                <div className="w-20">
                  <Slider
                    defaultValue={[30]}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs">Link Distance</span>
                <div className="w-20">
                  <Slider
                    defaultValue={[50]}
                    min={20}
                    max={200}
                    step={10}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-1 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
              >
                <RotateCw className="h-3 w-3 mr-1" />
                Restart
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
              >
                <SkipBack className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <span>Zoom: {Math.round(zoomLevel)}%</span>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs h-5">
              {currentLayout}
            </Badge>
            <Badge variant="secondary" className="text-xs h-5">
              {interactionMode}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}