'use client';

import * as React from 'react';
import type { Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from './data-table-view-options';

// ============================================================================
// Props Interface
// ============================================================================

interface DataTableToolbarProps<TData> {
  table: Table<TData>;

  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Custom filters (slot)
  filters?: React.ReactNode;

  // Custom actions (slot)
  actions?: React.ReactNode;

  // Options
  showViewOptions?: boolean;
  showReset?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTableToolbar<TData>({
  table,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  actions,
  showViewOptions = true,
  showReset = true,
}: DataTableToolbarProps<TData>) {
  // Check if any filters are active
  const isFiltered = searchValue.length > 0 || table.getState().columnFilters.length > 0;

  const handleReset = () => {
    onSearchChange?.('');
    table.resetColumnFilters();
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Search Input */}
        {onSearchChange && (
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}

        {/* Custom Filters Slot */}
        {filters}

        {/* Reset Button */}
        {showReset && isFiltered && (
          <Button variant="ghost" onClick={handleReset} className="h-8 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Custom Actions Slot */}
        {actions}

        {/* View Options */}
        {showViewOptions && <DataTableViewOptions table={table} />}
      </div>
    </div>
  );
}
