import { cn } from '@/lib/utils'
import { RefreshCw, Loader2, Circle } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse' | 'refresh'
  className?: string
  text?: string
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'spinner', 
  className, 
  text 
}: LoadingSpinnerProps) {
  const sizeClass = sizeClasses[size]
  const textSizeClass = textSizeClasses[size]

  const renderSpinner = () => {
    switch (variant) {
      case 'refresh':
        return <RefreshCw className={cn(sizeClass, 'animate-spin', className)} />
      
      case 'dots':
        return (
          <div className={cn('flex space-x-1', className)}>
            <div className={cn('rounded-full bg-current animate-bounce', 
              size === 'xs' ? 'h-1 w-1' :
              size === 'sm' ? 'h-1.5 w-1.5' :
              size === 'md' ? 'h-2 w-2' :
              size === 'lg' ? 'h-3 w-3' : 'h-4 w-4'
            )} style={{ animationDelay: '0ms' }} />
            <div className={cn('rounded-full bg-current animate-bounce', 
              size === 'xs' ? 'h-1 w-1' :
              size === 'sm' ? 'h-1.5 w-1.5' :
              size === 'md' ? 'h-2 w-2' :
              size === 'lg' ? 'h-3 w-3' : 'h-4 w-4'
            )} style={{ animationDelay: '150ms' }} />
            <div className={cn('rounded-full bg-current animate-bounce', 
              size === 'xs' ? 'h-1 w-1' :
              size === 'sm' ? 'h-1.5 w-1.5' :
              size === 'md' ? 'h-2 w-2' :
              size === 'lg' ? 'h-3 w-3' : 'h-4 w-4'
            )} style={{ animationDelay: '300ms' }} />
          </div>
        )
      
      case 'pulse':
        return (
          <div className={cn(
            'rounded-full bg-current animate-pulse opacity-75',
            sizeClass,
            className
          )} />
        )
      
      case 'spinner':
      default:
        return <Loader2 className={cn(sizeClass, 'animate-spin', className)} />
    }
  }

  if (text) {
    return (
      <div className="flex items-center space-x-2">
        {renderSpinner()}
        <span className={cn('text-muted-foreground', textSizeClass)}>
          {text}
        </span>
      </div>
    )
  }

  return renderSpinner()
}