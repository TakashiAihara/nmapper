import { useState } from 'react'
import { Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  CheckSquare,
  Square,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  Download,
  Tag,
  Shield,
  AlertTriangle,
  X,
  Users
} from 'lucide-react'

interface DeviceSelectionProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkAction: (action: BulkAction) => void
  className?: string
}

type BulkAction = 
  | 'remove'
  | 'export'
  | 'tag'
  | 'risk-low'
  | 'risk-medium'
  | 'risk-high'
  | 'scan'
  | 'monitor'
  | 'unmonitor'

const BULK_ACTIONS: Array<{
  key: BulkAction
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  description: string
}> = [
  {
    key: 'export',
    label: 'Export Selected',
    icon: Download,
    variant: 'outline',
    description: 'Export selected devices to CSV/JSON'
  },
  {
    key: 'tag',
    label: 'Add Tags',
    icon: Tag,
    variant: 'outline',
    description: 'Add custom tags to selected devices'
  },
  {
    key: 'risk-low',
    label: 'Set Low Risk',
    icon: Shield,
    variant: 'outline',
    description: 'Mark selected devices as low risk'
  },
  {
    key: 'risk-medium',
    label: 'Set Medium Risk',
    icon: AlertTriangle,
    variant: 'outline',
    description: 'Mark selected devices as medium risk'
  },
  {
    key: 'risk-high',
    label: 'Set High Risk',
    icon: AlertTriangle,
    variant: 'outline',
    description: 'Mark selected devices as high risk'
  },
  {
    key: 'scan',
    label: 'Scan Selected',
    icon: Eye,
    variant: 'default',
    description: 'Perform targeted scan on selected devices'
  },
  {
    key: 'monitor',
    label: 'Enable Monitoring',
    icon: Users,
    variant: 'outline',
    description: 'Enable active monitoring for selected devices'
  },
  {
    key: 'unmonitor',
    label: 'Disable Monitoring',
    icon: Users,
    variant: 'outline',
    description: 'Disable monitoring for selected devices'
  },
  {
    key: 'remove',
    label: 'Remove Selected',
    icon: Trash2,
    variant: 'destructive',
    description: 'Remove selected devices from monitoring'
  }
]

export function DeviceSelection({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkAction,
  className
}: DeviceSelectionProps) {
  const [showActions, setShowActions] = useState(false)
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null)

  const isAllSelected = selectedCount === totalCount && totalCount > 0
  const isPartialSelection = selectedCount > 0 && selectedCount < totalCount

  const handleSelectToggle = () => {
    if (isAllSelected || isPartialSelection) {
      onClearSelection()
    } else {
      onSelectAll()
    }
  }

  const handleBulkAction = (action: BulkAction) => {
    if (action === 'remove') {
      setConfirmAction(action)
    } else {
      onBulkAction(action)
      setShowActions(false)
    }
  }

  const confirmBulkAction = () => {
    if (confirmAction) {
      onBulkAction(confirmAction)
      setConfirmAction(null)
      setShowActions(false)
    }
  }

  if (selectedCount === 0 && !showActions) {
    return null
  }

  return (
    <div className={cn(
      'flex items-center justify-between p-4 bg-muted/50 rounded-lg border',
      'transition-all duration-200',
      selectedCount > 0 && 'bg-primary/10 border-primary/20',
      className
    )}>
      {/* Selection Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSelectToggle}
            className={cn(
              'flex items-center justify-center w-5 h-5 border-2 rounded transition-colors',
              isAllSelected 
                ? 'bg-primary border-primary text-primary-foreground'
                : isPartialSelection
                ? 'bg-primary/50 border-primary text-primary-foreground'
                : 'border-muted-foreground hover:border-primary'
            )}
          >
            {isAllSelected ? (
              <CheckSquare className="w-3 h-3" />
            ) : isPartialSelection ? (
              <Square className="w-3 h-3 fill-current" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>
          
          <span className="text-sm font-medium">
            {selectedCount === 0 
              ? 'Select devices'
              : selectedCount === totalCount
              ? `All ${totalCount} devices selected`
              : `${selectedCount} of ${totalCount} devices selected`
            }
          </span>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="px-2 py-1">
              {selectedCount} selected
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="flex items-center space-x-2">
          {!showActions ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActions(true)}
              className="flex items-center space-x-1"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span>Actions</span>
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              {BULK_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <Button
                    key={action.key}
                    variant={action.variant || 'outline'}
                    size="sm"
                    onClick={() => handleBulkAction(action.key)}
                    className="flex items-center space-x-1"
                    title={action.description}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{action.label}</span>
                  </Button>
                )
              })}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowActions(false)
                  setConfirmAction(null)
                }}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg border shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Confirm Bulk Action</h3>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <p className="text-sm mb-6">
              Are you sure you want to remove {selectedCount} selected device{selectedCount !== 1 ? 's' : ''} from monitoring?
              This will permanently delete their data and stop monitoring their network activity.
            </p>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmBulkAction}
              >
                Remove Devices
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}