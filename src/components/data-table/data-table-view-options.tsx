'use client';

import type { Table } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Props Interface
// ============================================================================

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
          <Settings2 className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {formatColumnName(column.id)}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats column id to a readable name
 * e.g., "firstName" -> "First Name", "created_at" -> "Created At"
 */
function formatColumnName(columnId: string): string {
  return (
    columnId
      // Split by camelCase
      .replace(/([A-Z])/g, ' $1')
      // Split by snake_case
      .replace(/_/g, ' ')
      // Capitalize first letter of each word
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim()
  );
}
