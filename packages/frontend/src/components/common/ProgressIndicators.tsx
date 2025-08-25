import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { LoadingSpinner } from './LoadingSpinner'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Pause,
  Play,
  Square,
  RotateCcw,
  X
} from 'lucide-react'

interface ProgressStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed' | 'error' | 'skipped'
  description?: string
  duration?: number // in seconds
  error?: string
}

interface StepProgressProps {
  steps: ProgressStep[]
  currentStep?: string
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function StepProgress({ 
  steps, 
  currentStep, 
  className,
  orientation = 'vertical'
}: StepProgressProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep)
  
  const getStepIcon = (step: ProgressStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'active':
        return <LoadingSpinner size="sm" className="text-blue-500" />
      case 'skipped':
        return <X className="h-4 w-4 text-gray-400" />
      default:
        return (
          <div className={cn(
            'h-4 w-4 rounded-full border-2 flex items-center justify-center text-xs font-bold',
            index <= currentIndex ? 'border-blue-500 text-blue-500' : 'border-gray-300 text-gray-400'
          )}>
            {index + 1}
          </div>
        )
    }
  }

  const getStepLineColor = (index: number) => {
    const step = steps[index]
    if (step.status === 'completed') return 'bg-green-500'
    if (step.status === 'error') return 'bg-red-500'
    if (step.status === 'active') return 'bg-blue-500'
    if (index < currentIndex) return 'bg-blue-500'
    return 'bg-gray-200'
  }

  if (orientation === 'horizontal') {
    return (
      <div className={cn('flex items-center space-x-4', className)}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center space-y-2 min-w-0">
              <div className="flex items-center justify-center">
                {getStepIcon(step, index)}
              </div>
              
              <div className="text-center min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  step.status === 'active' ? 'text-blue-600' :
                  step.status === 'completed' ? 'text-green-600' :
                  step.status === 'error' ? 'text-red-600' :
                  'text-gray-500'
                )}>
                  {step.label}
                </p>
                
                {step.description && step.status === 'active' && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 min-w-8 mx-2">
                <div className={cn('h-full rounded', getStepLineColor(index))} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start space-x-3">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center">
              {getStepIcon(step, index)}
            </div>
            
            {index < steps.length - 1 && (
              <div className={cn(
                'w-0.5 h-12 mt-2 rounded',
                getStepLineColor(index)
              )} />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={cn(
                'text-sm font-medium',
                step.status === 'active' ? 'text-blue-600' :
                step.status === 'completed' ? 'text-green-600' :
                step.status === 'error' ? 'text-red-600' :
                'text-gray-500'
              )}>
                {step.label}
              </h4>
              
              {step.duration && step.status === 'completed' && (
                <span className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {step.duration}s
                </span>
              )}
            </div>
            
            {step.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {step.description}
              </p>
            )}
            
            {step.error && step.status === 'error' && (
              <p className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded border border-red-200">
                {step.error}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

interface CircularProgressProps {
  progress: number // 0-100
  size?: 'sm' | 'md' | 'lg'
  thickness?: number
  showPercentage?: boolean
  color?: 'primary' | 'success' | 'warning' | 'error'
  className?: string
  children?: React.ReactNode
}

export function CircularProgress({
  progress,
  size = 'md',
  thickness = 4,
  showPercentage = true,
  color = 'primary',
  className,
  children
}: CircularProgressProps) {
  const sizes = {
    sm: 40,
    md: 60,
    lg: 80
  }

  const colors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }

  const radius = (sizes[size] - thickness) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={sizes[size]}
        height={sizes[size]}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={sizes[size] / 2}
          cy={sizes[size] / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={thickness}
          fill="transparent"
          className="text-muted"
        />
        
        {/* Progress circle */}
        <circle
          cx={sizes[size] / 2}
          cy={sizes[size] / 2}
          r={radius}
          stroke={colors[color]}
          strokeWidth={thickness}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showPercentage && (
          <span className={cn(
            'font-semibold',
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
          )}>
            {Math.round(progress)}%
          </span>
        ))}
      </div>
    </div>
  )
}

interface LinearProgressProps {
  progress: number // 0-100
  indeterminate?: boolean
  height?: number
  color?: 'primary' | 'success' | 'warning' | 'error'
  showPercentage?: boolean
  className?: string
  label?: string
  description?: string
}

export function LinearProgress({
  progress,
  indeterminate = false,
  height = 8,
  color = 'primary',
  showPercentage = false,
  className,
  label,
  description
}: LinearProgressProps) {
  const colors = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  }

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      
      <div
        className="w-full bg-muted rounded-full overflow-hidden"
        style={{ height }}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            colors[color],
            indeterminate && 'animate-pulse'
          )}
          style={{
            width: indeterminate ? '100%' : `${progress}%`,
            animation: indeterminate ? 'progress-indeterminate 1.5s ease-in-out infinite' : undefined
          }}
        />
      </div>
      
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
      
      <style jsx>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

interface TaskProgressProps {
  title: string
  tasks: Array<{
    id: string
    name: string
    status: 'pending' | 'running' | 'completed' | 'error'
    progress?: number
    error?: string
    duration?: number
  }>
  onCancel?: () => void
  onRetry?: (taskId: string) => void
  onPause?: () => void
  onResume?: () => void
  isPaused?: boolean
  className?: string
}

export function TaskProgress({
  title,
  tasks,
  onCancel,
  onRetry,
  onPause,
  onResume,
  isPaused = false,
  className
}: TaskProgressProps) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const totalTasks = tasks.length
  const overallProgress = (completedTasks / totalTasks) * 100
  
  const currentTask = tasks.find(t => t.status === 'running')
  const hasErrors = tasks.some(t => t.status === 'error')

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>{title}</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {onPause && onResume && (
              <Button
                variant="outline"
                size="sm"
                onClick={isPaused ? onResume : onPause}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            )}
            
            {onCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onCancel}
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <LinearProgress
            progress={overallProgress}
            label="Overall Progress"
            showPercentage
            color={hasErrors ? 'error' : 'primary'}
          />
          
          <p className="text-sm text-muted-foreground">
            {completedTasks} of {totalTasks} tasks completed
            {currentTask && ` • Currently: ${currentTask.name}`}
            {isPaused && ' • Paused'}
          </p>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {task.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {task.status === 'error' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  {task.status === 'running' && (
                    <LoadingSpinner size="sm" className="text-blue-500" />
                  )}
                  {task.status === 'pending' && (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm truncate',
                    task.status === 'running' ? 'font-medium text-blue-600' :
                    task.status === 'completed' ? 'text-green-600' :
                    task.status === 'error' ? 'text-red-600' :
                    'text-muted-foreground'
                  )}>
                    {task.name}
                  </p>
                  
                  {task.error && task.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1">{task.error}</p>
                  )}
                  
                  {task.status === 'running' && task.progress !== undefined && (
                    <div className="mt-1">
                      <LinearProgress
                        progress={task.progress}
                        height={4}
                        color="primary"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {task.duration && task.status === 'completed' && (
                  <span>{task.duration}s</span>
                )}
                
                {task.status === 'error' && onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(task.id)}
                    className="h-6 w-6 p-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized progress components
export function ScanProgress({
  currentHost,
  totalHosts,
  completedHosts,
  currentPort,
  totalPorts,
  className
}: {
  currentHost?: string
  totalHosts?: number
  completedHosts?: number
  currentPort?: number
  totalPorts?: number
  className?: string
}) {
  const hostProgress = totalHosts && completedHosts ? (completedHosts / totalHosts) * 100 : 0
  
  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <CircularProgress
            progress={hostProgress}
            size="lg"
            color="primary"
            showPercentage
          />
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Network Scan in Progress</h3>
            
            {currentHost && (
              <p className="text-sm text-blue-600 mb-1">
                Scanning: {currentHost}
              </p>
            )}
            
            {totalHosts && completedHosts !== undefined && (
              <p className="text-sm text-muted-foreground mb-2">
                {completedHosts} of {totalHosts} hosts completed
              </p>
            )}
            
            {currentPort && totalPorts && (
              <LinearProgress
                progress={(currentPort / totalPorts) * 100}
                height={6}
                label={`Port ${currentPort} of ${totalPorts}`}
                showPercentage
                color="primary"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}