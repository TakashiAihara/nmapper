import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { useNetworkStore, networkSelectors } from '@/store'
import { cn } from '@/lib/utils'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Settings,
  Download,
  RefreshCw,
  Grid,
  Circle,
  GitBranch,
  Layers
} from 'lucide-react'

interface TopologyNode {
  id: string
  label: string
  type: 'device' | 'network' | 'gateway'
  status: 'online' | 'offline' | 'unknown'
  riskLevel: 'low' | 'medium' | 'high'
  x: number
  y: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface TopologyEdge {
  source: string
  target: string
  type: 'connection' | 'route'
  strength: number
}

interface TopologyCanvasProps {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  onNodeSelect?: (nodeId: string) => void
  onNodeDoubleClick?: (nodeId: string) => void
  className?: string
}

export function TopologyCanvas({
  nodes,
  edges,
  onNodeSelect,
  onNodeDoubleClick,
  className
}: TopologyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  
  const {
    topologyLayout,
    topologyZoom,
    topologyCenter,
    selectedNodes,
    setTopologyLayout,
    setTopologyZoom,
    setTopologyCenter,
    toggleNodeSelection
  } = useNetworkStore()

  const [isDragging, setIsDragging] = useState(false)
  const [dragNode, setDragNode] = useState<string | null>(null)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [simulation, setSimulation] = useState<any>(null)

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  // Node colors based on status and risk
  const getNodeColor = (node: TopologyNode) => {
    if (selectedNodes.has(node.id)) {
      return '#3b82f6' // blue for selected
    }
    
    if (node.status === 'offline') {
      return '#ef4444' // red for offline
    }
    
    switch (node.riskLevel) {
      case 'high':
        return '#dc2626'
      case 'medium':
        return '#f59e0b'
      case 'low':
        return '#10b981'
      default:
        return '#6b7280'
    }
  }

  // Node size based on type
  const getNodeSize = (node: TopologyNode) => {
    switch (node.type) {
      case 'gateway':
        return 12
      case 'network':
        return 10
      case 'device':
        return 8
      default:
        return 8
    }
  }

  // Initialize D3 simulation
  const initializeSimulation = useCallback(async () => {
    if (typeof window === 'undefined' || !nodes.length) return

    try {
      // Dynamic import to avoid SSR issues
      const d3 = await import('d3-force')
      
      const sim = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(edges).id((d: any) => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(canvasSize.width / 2, canvasSize.height / 2))
        .force('collision', d3.forceCollide().radius((d: any) => getNodeSize(d) + 5))

      // Apply layout-specific forces
      if (topologyLayout === 'grid') {
        sim.force('x', d3.forceX().x((d: any, i: number) => (i % 10) * 80 + 50))
          .force('y', d3.forceY().y((d: any, i: number) => Math.floor(i / 10) * 80 + 50))
      } else if (topologyLayout === 'circle') {
        sim.force('x', d3.forceX().x((d: any, i: number) => 
          canvasSize.width / 2 + 200 * Math.cos(2 * Math.PI * i / nodes.length)))
          .force('y', d3.forceY().y((d: any, i: number) => 
            canvasSize.height / 2 + 200 * Math.sin(2 * Math.PI * i / nodes.length)))
      }

      setSimulation(sim)
      
      sim.on('tick', () => {
        drawTopology()
      })

      return sim
    } catch (error) {
      console.warn('D3 not available, using static layout')
      // Fallback to static positioning
      nodes.forEach((node, i) => {
        node.x = (i % 10) * 80 + 50
        node.y = Math.floor(i / 10) * 80 + 50
      })
      drawTopology()
    }
  }, [nodes, edges, topologyLayout, canvasSize])

  // Draw the topology on canvas
  const drawTopology = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply zoom and pan transform
    ctx.save()
    ctx.translate(topologyCenter.x, topologyCenter.y)
    ctx.scale(topologyZoom, topologyZoom)

    // Draw edges
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      
      if (sourceNode && targetNode) {
        ctx.beginPath()
        ctx.moveTo(sourceNode.x, sourceNode.y)
        ctx.lineTo(targetNode.x, targetNode.y)
        
        // Line style based on connection type
        if (edge.type === 'route') {
          ctx.setLineDash([5, 5])
        } else {
          ctx.setLineDash([])
        }
        
        // Line opacity based on strength
        ctx.globalAlpha = edge.strength
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    })

    // Draw nodes
    nodes.forEach(node => {
      const radius = getNodeSize(node)
      const color = getNodeColor(node)

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()

      // Node border
      ctx.strokeStyle = selectedNodes.has(node.id) ? '#1d4ed8' : '#ffffff'
      ctx.lineWidth = selectedNodes.has(node.id) ? 3 : 1
      ctx.stroke()

      // Status indicator
      if (node.status === 'offline') {
        ctx.beginPath()
        ctx.arc(node.x + radius - 2, node.y - radius + 2, 3, 0, 2 * Math.PI)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Node label
      if (topologyZoom > 0.5) {
        ctx.fillStyle = '#374151'
        ctx.font = `${Math.max(10, 12 * topologyZoom)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(node.label, node.x, node.y + radius + 15)
      }
    })

    ctx.restore()
  }, [nodes, edges, selectedNodes, topologyZoom, topologyCenter])

  // Handle canvas interactions
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left - topologyCenter.x) / topologyZoom
    const y = (event.clientY - rect.top - topologyCenter.y) / topologyZoom

    // Check if clicking on a node
    const clickedNode = nodes.find(node => {
      const dx = x - node.x
      const dy = y - node.y
      const radius = getNodeSize(node)
      return dx * dx + dy * dy <= radius * radius
    })

    if (clickedNode) {
      setDragNode(clickedNode.id)
      if (onNodeSelect) {
        onNodeSelect(clickedNode.id)
      }
      toggleNodeSelection(clickedNode.id)
    } else {
      setIsDragging(true)
      setLastMousePos({ x: event.clientX, y: event.clientY })
    }
  }, [nodes, topologyZoom, topologyCenter, onNodeSelect, toggleNodeSelection])

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const dx = event.clientX - lastMousePos.x
      const dy = event.clientY - lastMousePos.y
      
      setTopologyCenter({
        x: topologyCenter.x + dx,
        y: topologyCenter.y + dy
      })
      
      setLastMousePos({ x: event.clientX, y: event.clientY })
    } else if (dragNode && simulation) {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = (event.clientX - rect.left - topologyCenter.x) / topologyZoom
      const y = (event.clientY - rect.top - topologyCenter.y) / topologyZoom

      const node = nodes.find(n => n.id === dragNode)
      if (node) {
        node.fx = x
        node.fy = y
        simulation.alpha(0.3).restart()
      }
    }
  }, [isDragging, dragNode, lastMousePos, topologyCenter, topologyZoom, nodes, simulation])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    if (dragNode && simulation) {
      const node = nodes.find(n => n.id === dragNode)
      if (node) {
        node.fx = null
        node.fy = null
      }
    }
    setDragNode(null)
  }, [dragNode, nodes, simulation])

  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left - topologyCenter.x) / topologyZoom
    const y = (event.clientY - rect.top - topologyCenter.y) / topologyZoom

    const clickedNode = nodes.find(node => {
      const dx = x - node.x
      const dy = y - node.y
      const radius = getNodeSize(node)
      return dx * dx + dy * dy <= radius * radius
    })

    if (clickedNode && onNodeDoubleClick) {
      onNodeDoubleClick(clickedNode.id)
    }
  }, [nodes, topologyZoom, topologyCenter, onNodeDoubleClick])

  // Zoom controls
  const handleZoomIn = () => {
    setTopologyZoom(Math.min(topologyZoom * 1.2, 3))
  }

  const handleZoomOut = () => {
    setTopologyZoom(Math.max(topologyZoom / 1.2, 0.1))
  }

  const handleResetView = () => {
    setTopologyZoom(1)
    setTopologyCenter({ x: 0, y: 0 })
  }

  const handleLayoutChange = (layout: typeof topologyLayout) => {
    setTopologyLayout(layout)
  }

  const exportTopology = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const link = document.createElement('a')
      link.download = 'network-topology.png'
      link.href = canvas.toDataURL()
      link.click()
    }
  }

  // Update canvas size when container changes
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas && canvas.parentElement) {
        const parent = canvas.parentElement
        const width = parent.clientWidth
        const height = Math.max(400, parent.clientHeight)
        
        setCanvasSize({ width, height })
        canvas.width = width
        canvas.height = height
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Initialize simulation when nodes change
  useEffect(() => {
    initializeSimulation()
  }, [initializeSimulation])

  // Redraw when dependencies change
  useEffect(() => {
    drawTopology()
  }, [drawTopology])

  return (
    <Card className={cn('relative', className, isFullscreen && 'fixed inset-0 z-50')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5" />
            <span>Network Topology</span>
            <Badge variant="outline">
              {nodes.length} nodes, {edges.length} connections
            </Badge>
          </CardTitle>

          <div className="flex items-center space-x-2">
            {/* Layout Controls */}
            <div className="flex border rounded-md">
              <Button
                variant={topologyLayout === 'force' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleLayoutChange('force')}
                className="rounded-r-none px-2"
                title="Force-directed layout"
              >
                <Circle className="h-3 w-3" />
              </Button>
              <Button
                variant={topologyLayout === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleLayoutChange('grid')}
                className="rounded-none border-x px-2"
                title="Grid layout"
              >
                <Grid className="h-3 w-3" />
              </Button>
              <Button
                variant={topologyLayout === 'circle' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleLayoutChange('circle')}
                className="rounded-none border-x px-2"
                title="Circular layout"
              >
                <Circle className="h-3 w-3" />
              </Button>
              <Button
                variant={topologyLayout === 'tree' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleLayoutChange('tree')}
                className="rounded-l-none px-2"
                title="Tree layout"
              >
                <GitBranch className="h-3 w-3" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex border rounded-md">
              <Button variant="ghost" size="sm" onClick={handleZoomOut} className="rounded-r-none">
                <ZoomOut className="h-3 w-3" />
              </Button>
              <div className="px-2 py-1 text-xs border-x flex items-center min-w-[50px] justify-center">
                {Math.round(topologyZoom * 100)}%
              </div>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} className="rounded-l-none">
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={handleResetView} title="Reset view">
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" onClick={exportTopology} title="Export as image">
              <Download className="h-4 w-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative" style={{ height: isFullscreen ? 'calc(100vh - 100px)' : '600px' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3">
            <h4 className="text-xs font-semibold mb-2">Legend</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Low Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Medium Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>High Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>Offline</span>
              </div>
            </div>
          </div>

          {/* Selected nodes info */}
          {selectedNodes.size > 0 && (
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3">
              <div className="text-sm font-medium">
                {selectedNodes.size} node{selectedNodes.size !== 1 ? 's' : ''} selected
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Double-click to view details
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}