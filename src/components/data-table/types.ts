import type { Column, Table, ColumnDef } from '@tanstack/react-table';

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface PaginationMeta {
  pageCount: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// Sorting Types
// ============================================================================

export interface SortingState {
  id: string;
  desc: boolean;
}

export type SortOrder = 'asc' | 'desc';

// ============================================================================
// Filter Types
// ============================================================================

export interface FilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: FilterOption[];
}

export interface SearchFilter {
  id: string;
  value: string;
}

// ============================================================================
// Data Table Props
// ============================================================================

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // Server-side pagination
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  totalCount?: number;
  onPaginationChange: (pageIndex: number, pageSize: number) => void;

  // Server-side sorting
  sorting: SortingState[];
  onSortingChange: (sorting: SortingState[]) => void;

  // Server-side filtering
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchColumn?: string;

  // Optional features
  isLoading?: boolean;
  toolbar?: React.ReactNode;
  emptyMessage?: string;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedRows: TData[]) => void;

  // Customization
  pageSizeOptions?: number[];
}

// ============================================================================
// Column Header Props
// ============================================================================

export interface DataTableColumnHeaderProps<
  TData,
  TValue,
> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

// ============================================================================
// Row Actions
// ============================================================================

export interface RowAction<TData> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: TData) => void;
  variant?: 'default' | 'destructive';
  separator?: boolean;
}

export interface DataTableRowActionsProps<TData> {
  row: TData;
  actions: RowAction<TData>[];
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseDataTableReturn {
  // State
  pageIndex: number;
  pageSize: number;
  sorting: SortingState[];
  searchValue: string;

  // Query params for API
  queryParams: Record<string, unknown>;

  // Handlers
  handlePaginationChange: (pageIndex: number, pageSize: number) => void;
  handleSortingChange: (sorting: SortingState[]) => void;
  handleSearchChange: (value: string) => void;
  resetFilters: () => void;
}

export interface UseDataTableOptions {
  defaultPageSize?: number;
  defaultSorting?: SortingState[];
  pageSizeOptions?: number[];
  debounceMs?: number;
}

// ============================================================================
// API Response Types (for your backend)
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    pageCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ============================================================================
// Table Instance Helper
// ============================================================================

export type DataTableInstance<TData> = Table<TData>;
