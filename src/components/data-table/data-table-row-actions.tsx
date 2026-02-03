'use client';

import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Types
// ============================================================================

export interface RowAction<TData> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: (row: TData) => void | Promise<void>;
  variant?: 'default' | 'destructive';
  disabled?: boolean | ((row: TData) => boolean);
  hidden?: boolean | ((row: TData) => boolean);
}

export interface RowActionGroup<TData> {
  label?: string;
  actions: RowAction<TData>[];
}

interface DataTableRowActionsProps<TData> {
  row: TData;
  actions: (RowAction<TData> | RowActionGroup<TData>)[];
  label?: string;
}

// ============================================================================
// Helper to check if item is a group
// ============================================================================

function isActionGroup<TData>(
  item: RowAction<TData> | RowActionGroup<TData>
): item is RowActionGroup<TData> {
  return 'actions' in item;
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTableRowActions<TData>({
  row,
  actions,
  label = 'Actions',
}: DataTableRowActionsProps<TData>) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async (action: RowAction<TData>) => {
    try {
      setIsLoading(true);
      await action.onClick?.(row);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = (action: RowAction<TData>) => {
    if (typeof action.disabled === 'function') {
      return action.disabled(row);
    }
    return action.disabled;
  };

  const isHidden = (action: RowAction<TData>) => {
    if (typeof action.hidden === 'function') {
      return action.hidden(row);
    }
    return action.hidden;
  };

  const renderAction = (action: RowAction<TData>, index: number) => {
    if (isHidden(action)) return null;

    return (
      <DropdownMenuItem
        key={index}
        onClick={() => handleClick(action)}
        disabled={isLoading || isDisabled(action)}
        className={cn(
          action.variant === 'destructive' && 'text-destructive focus:text-destructive'
        )}
      >
        {action.icon && <action.icon className="mr-2 h-4 w-4" />}
        {action.label}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="data-[state=open]:bg-muted flex h-8 w-8 p-0"
          disabled={isLoading}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {actions.map((item, index) => {
          if (isActionGroup(item)) {
            // Render action group
            const visibleActions = item.actions.filter((a) => !isHidden(a));
            if (visibleActions.length === 0) return null;

            return (
              <React.Fragment key={index}>
                {index > 0 && <DropdownMenuSeparator />}
                {item.label && (
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    {item.label}
                  </DropdownMenuLabel>
                )}
                {visibleActions.map((action, actionIndex) => renderAction(action, actionIndex))}
              </React.Fragment>
            );
          }

          // Render single action
          return renderAction(item, index);
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
