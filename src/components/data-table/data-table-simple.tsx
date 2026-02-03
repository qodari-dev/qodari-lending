'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// Types
// ============================================================================

interface DataTableSimpleProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // Optional features
  searchable?: boolean;
  searchPlaceholder?: string;
  searchColumn?: string; // Column to filter by, or "global" for all columns

  // Pagination
  paginated?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];

  // Selection
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedRows: TData[]) => void;

  // Customization
  toolbar?: React.ReactNode;
  emptyMessage?: string;

  // Compact mode for nested tables
  compact?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTableSimple<TData, TValue>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchColumn = 'global',
  paginated = true,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  enableRowSelection = false,
  onRowSelectionChange,
  toolbar,
  emptyMessage = 'No results.',
  compact = false,
}: DataTableSimpleProps<TData, TValue>) {
  // State
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // React Compiler marks TanStack's table hook as incompatible; usage stays local so opt out of the lint.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue).toLowerCase();
      return row.getAllCells().some((cell) => {
        const value = cell.getValue();
        if (value == null) return false;
        return String(value).toLowerCase().includes(search);
      });
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newSelection);

      if (onRowSelectionChange) {
        const selectedRows = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => data[parseInt(key)])
          .filter(Boolean);
        onRowSelectionChange(selectedRows);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: paginated ? getPaginationRowModel() : undefined,
  });

  // Set default page size
  React.useEffect(() => {
    if (paginated) {
      table.setPageSize(defaultPageSize);
    }
  }, [defaultPageSize, paginated, table]);

  // Handle search
  const handleSearch = (value: string) => {
    if (searchColumn === 'global') {
      setGlobalFilter(value);
    } else {
      table.getColumn(searchColumn)?.setFilterValue(value);
    }
  };

  const searchValue =
    searchColumn === 'global'
      ? globalFilter
      : ((table.getColumn(searchColumn)?.getFilterValue() as string) ?? '');

  const isFiltered = globalFilter !== '' || columnFilters.length > 0;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {/* Toolbar */}
      {(searchable || toolbar) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-1 items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={
                    compact ? 'h-8 w-[150px] pl-8 lg:w-[200px]' : 'h-9 w-[150px] pl-8 lg:w-[250px]'
                  }
                />
              </div>
            )}
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={() => {
                  setGlobalFilter('');
                  setColumnFilters([]);
                }}
                className="h-8 px-2"
              >
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          {toolbar}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={compact ? 'h-9 px-2' : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={compact ? 'px-2 py-2' : undefined}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginated && data.length > defaultPageSize && (
        <div className="flex items-center justify-between px-2">
          <div className="text-muted-foreground flex-1 text-sm">
            {enableRowSelection && table.getFilteredSelectedRowModel().rows.length > 0 ? (
              <span>
                {table.getFilteredSelectedRowModel().rows.length} of{' '}
                {table.getFilteredRowModel().rows.length} row(s) selected
              </span>
            ) : (
              <span>{table.getFilteredRowModel().rows.length} row(s) total</span>
            )}
          </div>

          <div className="flex items-center space-x-6 lg:space-x-8">
            {/* Page size selector */}
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows</p>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
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

            {/* Page indicator */}
            <div className="text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
