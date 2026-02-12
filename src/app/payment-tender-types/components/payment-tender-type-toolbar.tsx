'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Plus, RefreshCw } from 'lucide-react';
import * as React from 'react';

// ============================================================================
// Props Interface
// ============================================================================

interface ToolbarProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;

  // Actions
  onRefresh?: () => void;
  onCreate?: () => void;

  // Export
  exportActions?: React.ReactNode;

  // Loading states
  isRefreshing?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================
export function PaymentTenderTypesToolbar({
  searchValue,
  onSearchChange,
  onRefresh,
  onCreate,
  exportActions,
  isRefreshing = false,
}: ToolbarProps) {
  const canCreate = useHasPermission('payment-tender-types:create');

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        {/* Search Input */}
        <Input
          placeholder="Buscar por nombre..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="md:max-w-xs"
        />
      </div>

      <div className="flex items-center space-x-2">
        {exportActions}

        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        )}

        {/* Create Button */}
        {onCreate && canCreate && (
          <Button type="button" size="sm" onClick={onCreate} className="h-9">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo
          </Button>
        )}
      </div>
    </div>
  );
}
