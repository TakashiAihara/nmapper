import { useMemo } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface DataPoint {
  timestamp: string
  time: string
  cpu: number
  memory: number
  disk: number
  network: number
}

interface PerformanceChartProps {
  data?: DataPoint[]
  metric?: 'cpu' | 'memory' | 'disk' | 'network'
  timeRange?: '1h' | '6h' | '24h' | '7d'
  className?: string
}

export function PerformanceChart({ 
  data = [], 
  metric = 'cpu', 
  timeRange = '1h', 
  className 
}: PerformanceChartProps) {
  
  // Generate mock data if none provided
  const mockData = useMemo(() => {
    const now = new Date()
    const points = timeRange === '1h' ? 60 : timeRange === '6h' ? 72 : timeRange === '24h' ? 144 : 168
    const interval = timeRange === '1h' ? 1 : timeRange === '6h' ? 5 : timeRange === '24h' ? 10 : 60
    
    return Array.from({ length: points }, (_, i) => {
      const time = new Date(now.getTime() - (points - i) * interval * 60 * 1000)
      const baseVariation = Math.sin(i / 10) * 10
      
      return {
        timestamp: time.toISOString(),
        time: time.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        cpu: Math.max(0, Math.min(100, 35 + baseVariation + (Math.random() - 0.5) * 20)),
        memory: Math.max(0, Math.min(100, 60 + baseVariation * 0.5 + (Math.random() - 0.5) * 15)),
        disk: Math.max(0, Math.min(100, 45 + baseVariation * 0.3 + (Math.random() - 0.5) * 10)),
        network: Math.max(0, Math.min(100, 25 + Math.abs(baseVariation) + (Math.random() - 0.5) * 30))
      }
    })
  }, [timeRange])

  const chartData = data.length > 0 ? data : mockData
  const currentValue = chartData[chartData.length - 1]?.[metric] || 0
  const previousValue = chartData[chartData.length - 2]?.[metric] || 0
  const trend = currentValue - previousValue

  const getMetricConfig = (metricType: string) => {
    switch (metricType) {
      case 'cpu':
        return {
          label: 'CPU Usage',
          color: '#3b82f6',
          unit: '%',
          icon: Activity,
          gradient: ['#3b82f6', '#1d4ed8']
        }
      case 'memory':
        return {
          label: 'Memory Usage',
          color: '#10b981',
          unit: '%',
          icon: Activity,
          gradient: ['#10b981', '#059669']
        }
      case 'disk':
        return {
          label: 'Disk I/O',
          color: '#f59e0b',
          unit: '%',
          icon: Activity,
          gradient: ['#f59e0b', '#d97706']
        }
      case 'network':
        return {
          label: 'Network Usage',
          color: '#8b5cf6',
          unit: '%',
          icon: Activity,
          gradient: ['#8b5cf6', '#7c3aed']
        }
      default:
        return {
          label: 'Metric',
          color: '#6b7280',
          unit: '',
          icon: Activity,
          gradient: ['#6b7280', '#4b5563']
        }
    }
  }

  const config = getMetricConfig(metric)
  const Icon = config.icon

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Icon className="h-5 w-5" style={{ color: config.color }} />
            <span>{config.label}</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {currentValue.toFixed(1)}{config.unit}
            </Badge>
            
            <div className="flex items-center space-x-1">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : trend < 0 ? (
                <TrendingDown className="h-4 w-4 text-green-500" />
              ) : null}
              
              {trend !== 0 && (
                <span className={cn(
                  'text-xs',
                  trend > 0 ? 'text-red-500' : 'text-green-500'
                )}>
                  {Math.abs(trend).toFixed(1)}{config.unit}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-muted" 
                vertical={false}
              />
              
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                interval="preserveStartEnd"
              />
              
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}${config.unit}`}
              />
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium">{label}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          <span className="text-sm">
                            {config.label}: {payload[0].value?.toFixed(1)}{config.unit}
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              
              <Area
                type="monotone"
                dataKey={metric}
                stroke={config.color}
                strokeWidth={2}
                fill={`url(#gradient-${metric})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: config.color,
                  strokeWidth: 0
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="text-sm font-medium">
              {(chartData.reduce((sum, point) => sum + point[metric], 0) / chartData.length).toFixed(1)}{config.unit}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Maximum</p>
            <p className="text-sm font-medium">
              {Math.max(...chartData.map(point => point[metric])).toFixed(1)}{config.unit}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Minimum</p>
            <p className="text-sm font-medium">
              {Math.min(...chartData.map(point => point[metric])).toFixed(1)}{config.unit}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}