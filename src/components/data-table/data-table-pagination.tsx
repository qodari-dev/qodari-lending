'use client';

import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// Props Interface
// ============================================================================

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  totalCount?: number;
  onPaginationChange: (pageIndex: number, pageSize: number) => void;
  pageSizeOptions?: number[];
  showSelectedCount?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTablePagination<TData>({
  table,
  pageCount,
  pageIndex,
  pageSize,
  totalCount,
  onPaginationChange,
  pageSizeOptions = [10, 20, 30, 50],
  showSelectedCount = true,
}: DataTablePaginationProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const rowCount = table.getFilteredRowModel().rows.length;

  // Calculate display info
  const startRow = pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalCount ?? rowCount);

  return (
    <div className="flex flex-col justify-between gap-2 px-2 lg:flex-row lg:items-center">
      {/* Left side - Selection count */}
      <div className="text-muted-foreground flex-1 text-sm">
        {showSelectedCount && selectedCount > 0 ? (
          <span>
            {selectedCount} de {rowCount} fila(s) seleccionada(s)
          </span>
        ) : totalCount ? (
          <span>
            Mostrando {startRow} a {endRow} de {totalCount} resultados
          </span>
        ) : null}
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center space-x-6 lg:space-x-8">
        {/* Rows per page */}
        <div className="flex flex-col items-center gap-2 lg:flex-row">
          <p className="text-sm font-medium">Filas por página</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              onPaginationChange(0, Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page info */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Página {pageIndex + 1} de {pageCount || 1}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          {/* First page */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPaginationChange(0, pageSize)}
            disabled={pageIndex === 0}
          >
            <span className="sr-only">Ir a primera página</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPaginationChange(pageIndex - 1, pageSize)}
            disabled={pageIndex === 0}
          >
            <span className="sr-only">Ir a página anterior</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Next page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPaginationChange(pageIndex + 1, pageSize)}
            disabled={pageIndex >= pageCount - 1}
          >
            <span className="sr-only">Ir a página siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPaginationChange(pageCount - 1, pageSize)}
            disabled={pageIndex >= pageCount - 1}
          >
            <span className="sr-only">Ir a última página</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
