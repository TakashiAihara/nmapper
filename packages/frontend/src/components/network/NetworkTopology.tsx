import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { NetworkTopology, TopologyDevice, NetworkConnection } from '@nmapper/shared'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react'

interface NetworkTopologyProps {
  topology: NetworkTopology
  onDeviceClick?: (device: TopologyDevice) => void
  className?: string
}

interface SimulationNode extends TopologyDevice {
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface SimulationLink extends NetworkConnection {
  source: SimulationNode | string
  target: SimulationNode | string
}

const DEVICE_COLORS = {
  server: '#3b82f6',      // blue
  workstation: '#10b981', // green
  mobile: '#f59e0b',      // amber
  iot: '#8b5cf6',         // purple
  network: '#ef4444',     // red
  unknown: '#6b7280'      // gray
}

const RISK_COLORS = {
  low: '#10b981',    // green
  medium: '#f59e0b', // amber
  high: '#ef4444'    // red
}

export function NetworkTopology({ topology, onDeviceClick, className }: NetworkTopologyProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [showLabels, setShowLabels] = useState(true)
  const [showConnections, setShowConnections] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(['server', 'workstation', 'mobile', 'iot', 'network', 'unknown'])
  )

  // Filter devices and connections based on selected categories
  const filteredDevices = topology.devices.filter(device => 
    selectedCategories.has(device.category)
  )
  
  const filteredConnections = topology.connections.filter(connection =>
    filteredDevices.some(d => d.ip === connection.fromDevice) &&
    filteredDevices.some(d => d.ip === connection.toDevice)
  )

  useEffect(() => {
    if (!svgRef.current || filteredDevices.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const { width, height } = dimensions
    
    // Create main group for zoom/pan
    const g = svg.append("g").attr("class", "main-group")

    // Set up zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })

    svg.call(zoom)

    // Prepare data for simulation
    const nodes: SimulationNode[] = filteredDevices.map(device => ({
      ...device,
      x: device.position?.x || Math.random() * width,
      y: device.position?.y || Math.random() * height
    }))

    const links: SimulationLink[] = filteredConnections.map(connection => ({
      ...connection,
      source: nodes.find(n => n.ip === connection.fromDevice) || connection.fromDevice,
      target: nodes.find(n => n.ip === connection.toDevice) || connection.toDevice
    }))

    // Create force simulation
    const simulation = d3.forceSimulation<SimulationNode>(nodes)
      .force("link", d3.forceLink<SimulationNode, SimulationLink>(links)
        .id(d => d.ip)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30))

    // Create link elements
    const linkGroup = g.append("g").attr("class", "links")
    const link = linkGroup.selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", showConnections ? 0.6 : 0)
      .attr("stroke-width", d => d.connectionType === 'direct' ? 2 : 1)
      .attr("stroke-dasharray", d => d.connectionType === 'routed' ? "5,5" : null)

    // Create node groups
    const nodeGroup = g.append("g").attr("class", "nodes")
    const node = nodeGroup.selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, SimulationNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", (event, d) => {
        onDeviceClick?.(d)
      })

    // Add device circles
    node.append("circle")
      .attr("r", d => d.isActive ? 12 : 8)
      .attr("fill", d => DEVICE_COLORS[d.category] || DEVICE_COLORS.unknown)
      .attr("stroke", d => RISK_COLORS[d.riskLevel] || "#fff")
      .attr("stroke-width", 2)
      .attr("opacity", d => d.isActive ? 1 : 0.5)

    // Add device icons (simplified)
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("font-size", "8px")
      .attr("fill", "white")
      .text(d => {
        switch (d.category) {
          case 'server': return 'S'
          case 'workstation': return 'W'
          case 'mobile': return 'M'
          case 'iot': return 'I'
          case 'network': return 'N'
          default: return '?'
        }
      })

    // Add labels
    if (showLabels) {
      node.append("text")
        .attr("dx", 15)
        .attr("dy", ".35em")
        .attr("font-size", "10px")
        .attr("fill", "currentColor")
        .text(d => d.hostname || d.ip)
        .style("pointer-events", "none")
    }

    // Add tooltips
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")

    node
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", .9)
        tooltip.html(`
          <div><strong>${d.hostname || d.ip}</strong></div>
          <div>Category: ${d.category}</div>
          <div>Risk: ${d.riskLevel || 'unknown'}</div>
          <div>Status: ${d.isActive ? 'Online' : 'Offline'}</div>
          ${d.vendor ? `<div>Vendor: ${d.vendor}</div>` : ''}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px")
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0)
      })

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as SimulationNode).x!)
        .attr("y1", d => (d.source as SimulationNode).y!)
        .attr("x2", d => (d.target as SimulationNode).x!)
        .attr("y2", d => (d.target as SimulationNode).y!)

      node.attr("transform", d => `translate(${d.x},${d.y})`)
    })

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    // Add zoom controls
    const zoomIn = () => {
      svg.transition().call(zoom.scaleBy, 1.5)
    }

    const zoomOut = () => {
      svg.transition().call(zoom.scaleBy, 1 / 1.5)
    }

    const resetView = () => {
      svg.transition().call(zoom.transform, d3.zoomIdentity)
    }

    // Cleanup function
    return () => {
      simulation.stop()
      tooltip.remove()
    }
  }, [filteredDevices, filteredConnections, dimensions, showLabels, showConnections])

  const toggleCategory = (category: string) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(category)) {
      newSelected.delete(category)
    } else {
      newSelected.add(category)
    }
    setSelectedCategories(newSelected)
  }

  const deviceCounts = topology.devices.reduce((acc, device) => {
    acc[device.category] = (acc[device.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>Network Topology</span>
            <Badge variant="outline">{filteredDevices.length} devices</Badge>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLabels(!showLabels)}
            >
              {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Labels
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConnections(!showConnections)}
            >
              {showConnections ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Connections
            </Button>
          </div>
        </div>
        
        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(deviceCounts).map(([category, count]) => (
            <Button
              key={category}
              variant={selectedCategories.has(category) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleCategory(category)}
              className="text-xs"
            >
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: DEVICE_COLORS[category as keyof typeof DEVICE_COLORS] }}
              />
              {category} ({count})
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full border-t"
        />
        
        {/* Zoom controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const svg = d3.select(svgRef.current!)
              svg.transition().call(
                d3.zoom<SVGSVGElement, unknown>().scaleBy,
                1.5
              )
            }}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const svg = d3.select(svgRef.current!)
              svg.transition().call(
                d3.zoom<SVGSVGElement, unknown>().scaleBy,
                1 / 1.5
              )
            }}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const svg = d3.select(svgRef.current!)
              svg.transition().call(
                d3.zoom<SVGSVGElement, unknown>().transform,
                d3.zoomIdentity
              )
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-background/90 border rounded-lg p-3">
          <h4 className="text-sm font-semibold mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div>Circle size: Online/Offline status</div>
            <div>Border color: Risk level</div>
            <div>Solid line: Direct connection</div>
            <div>Dashed line: Routed connection</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}