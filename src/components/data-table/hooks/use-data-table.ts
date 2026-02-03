'use client';

import * as React from 'react';
import type { SortingState } from '@tanstack/react-table';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

// ============================================================================
// Types - Compatible con tu formato de query (GENÉRICOS)
// ============================================================================

/**
 * Formato de sort compatible con tu backend:
 * sort: [{ field: 'createdAt', order: 'desc' }]
 *
 * TField permite tipos específicos como:
 * "id" | "email" | "createdAt" | "status" | ...
 */
export interface SortItem<TField extends string = string> {
  field: TField;
  order: 'asc' | 'desc';
}

/**
 * Formato de where compatible con tu backend:
 * where: { and: [{ status: 'active' }], or: [...] }
 */
export type WhereFilter = Record<string, unknown>;

export interface WhereClause {
  and?: WhereFilter[];
  or?: WhereFilter[];
}

/**
 * Opciones del hook - genérico para soportar campos de sort específicos
 */
export interface UseDataTableOptions<
  TSortField extends string = string,
  TInclude extends string = string,
> {
  defaultPageSize?: number;
  defaultSorting?: SortItem<TSortField>[];
  defaultIncludes?: TInclude[];
  debounceMs?: number;
  syncWithUrl?: boolean;
}

/**
 * Return type del hook - genérico para tipos específicos
 */
export interface UseDataTableReturn<
  TSortField extends string = string,
  TInclude extends string = string,
> {
  // Pagination state
  pageIndex: number;
  pageSize: number;

  // Sorting state (TanStack format for table)
  sorting: SortingState;

  // Search/Filter state
  searchValue: string;
  filters: Record<string, unknown>;

  // Query params for ts-rest API (tu formato)
  queryParams: {
    page: number;
    limit: number;
    search?: string;
    sort?: SortItem<TSortField>[];
    where?: WhereClause;
    include?: TInclude[];
  };

  // Handlers
  handlePaginationChange: (pageIndex: number, pageSize: number) => void;
  handleSortingChange: (sorting: SortingState) => void;
  handleSearchChange: (value: string) => void;
  handleFilterChange: (key: string, value: unknown) => void;
  setWhereFilter: (field: string, value: unknown) => void;
  resetFilters: () => void;
  resetAll: () => void;
}

// ============================================================================
// Helpers - Conversión entre TanStack y tu formato
// ============================================================================

/**
 * Convierte SortingState de TanStack a tu formato de sort
 */
function tanstackToSort<TField extends string>(sorting: SortingState): SortItem<TField>[] {
  return sorting.map((s) => ({
    field: s.id as TField,
    order: s.desc ? 'desc' : 'asc',
  }));
}

/**
 * Convierte tu formato de sort a SortingState de TanStack
 */
function sortToTanstack<TField extends string>(sort: SortItem<TField>[]): SortingState {
  return sort.map((s) => ({
    id: s.field,
    desc: s.order === 'desc',
  }));
}

// ============================================================================
// Hook Implementation - GENÉRICO
// ============================================================================

export function useDataTable<TSortField extends string = string, TInclude extends string = string>({
  defaultPageSize = 20,
  defaultSorting = [],
  defaultIncludes = [],
  debounceMs = 300,
  syncWithUrl = true,
}: UseDataTableOptions<TSortField, TInclude> = {}): UseDataTableReturn<TSortField, TInclude> {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---- Initialize State from URL or Defaults ----

  const [pageIndex, setPageIndex] = React.useState(() => {
    if (!syncWithUrl) return 0;
    const page = searchParams.get('page');
    return page ? Math.max(0, parseInt(page) - 1) : 0;
  });

  const [pageSize, setPageSize] = React.useState(() => {
    if (!syncWithUrl) return defaultPageSize;
    const size = searchParams.get('limit');
    return size ? parseInt(size) : defaultPageSize;
  });

  const [sorting, setSorting] = React.useState<SortingState>(() => {
    if (!syncWithUrl) return sortToTanstack(defaultSorting);
    const sortField = searchParams.get('sortField');
    const sortOrder = searchParams.get('sortOrder');
    if (sortField) {
      return [{ id: sortField, desc: sortOrder === 'desc' }];
    }
    return sortToTanstack(defaultSorting);
  });

  const [searchValue, setSearchValue] = React.useState(() => {
    if (!syncWithUrl) return '';
    return searchParams.get('search') ?? '';
  });

  // Filters para where clause
  const [filters, setFilters] = React.useState<Record<string, unknown>>(() => {
    if (!syncWithUrl) return {};

    const result: Record<string, unknown> = {};
    const status = searchParams.get('status');
    if (status) {
      result.status = status.includes(',') ? { in: status.split(',') } : status;
    }
    const isAdmin = searchParams.get('isAdmin');
    if (isAdmin) {
      result.isAdmin = isAdmin === 'true';
    }
    return result;
  });

  const [includes] = React.useState<string[]>(defaultIncludes);

  // ---- URL Sync ----

  const updateURL = React.useCallback(() => {
    if (!syncWithUrl) return;

    const params = new URLSearchParams();

    // Pagination
    if (pageIndex > 0) {
      params.set('page', (pageIndex + 1).toString());
    }
    if (pageSize !== defaultPageSize) {
      params.set('limit', pageSize.toString());
    }

    // Sorting
    if (sorting.length > 0) {
      params.set('sortField', sorting[0].id);
      params.set('sortOrder', sorting[0].desc ? 'desc' : 'asc');
    }

    // Search
    if (searchValue) {
      params.set('search', searchValue);
    }

    // Filters - simplificado para URL
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      if (typeof value === 'object' && value !== null) {
        // Handle operators like { in: ['active', 'pending'] }
        if ('in' in value && Array.isArray((value as { in: unknown[] }).in)) {
          params.set(key, (value as { in: string[] }).in.join(','));
        }
      } else if (typeof value === 'boolean') {
        params.set(key, value.toString());
      } else if (typeof value === 'string' && value) {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(newUrl, { scroll: false });
  }, [
    syncWithUrl,
    pathname,
    router,
    pageIndex,
    pageSize,
    defaultPageSize,
    sorting,
    searchValue,
    filters,
  ]);

  // Debounced URL update for search
  const debouncedUpdateURL = useDebouncedCallback(updateURL, debounceMs);

  // Update URL when state changes (except search which is debounced)
  React.useEffect(() => {
    updateURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, pageSize, sorting, filters]);

  // ---- Handlers ----

  const handlePaginationChange = React.useCallback(
    (newPageIndex: number, newPageSize: number) => {
      if (newPageSize !== pageSize) {
        setPageIndex(0);
      } else {
        setPageIndex(newPageIndex);
      }
      setPageSize(newPageSize);
    },
    [pageSize]
  );

  const handleSortingChange = React.useCallback((newSorting: SortingState) => {
    setSorting(newSorting);
    setPageIndex(0);
  }, []);

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearchValue(value);
      setPageIndex(0);
      debouncedUpdateURL();
    },
    [debouncedUpdateURL]
  );

  const handleFilterChange = React.useCallback((key: string, value: unknown) => {
    setFilters((prev) => {
      if (value === undefined || value === null || value === '') {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
    setPageIndex(0);
  }, []);

  /**
   * Helper para setear filtros en formato where
   * Ej: setWhereFilter('status', { in: ['active', 'pending'] })
   */
  const setWhereFilter = React.useCallback(
    (field: string, value: unknown) => {
      handleFilterChange(field, value);
    },
    [handleFilterChange]
  );

  const resetFilters = React.useCallback(() => {
    setSearchValue('');
    setFilters({});
    setPageIndex(0);
  }, []);

  const resetAll = React.useCallback(() => {
    setPageIndex(0);
    setPageSize(defaultPageSize);
    setSorting(sortToTanstack(defaultSorting));
    setSearchValue('');
    setFilters({});
  }, [defaultPageSize, defaultSorting]);

  // ---- Build Query Params for ts-rest API ----

  const queryParams = React.useMemo(() => {
    const params: {
      page: number;
      limit: number;
      search?: string;
      sort?: SortItem<TSortField>[];
      where?: WhereClause;
      include?: TInclude[];
    } = {
      page: pageIndex + 1,
      limit: pageSize,
    };

    // Search
    if (searchValue) {
      params.search = searchValue;
    }

    // Sort en tu formato: [{ field, order }]
    if (sorting.length > 0) {
      params.sort = tanstackToSort<TSortField>(sorting);
    }

    // Where clause en tu formato: { and: [...] }
    const filterEntries = Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    );

    if (filterEntries.length > 0) {
      params.where = {
        and: filterEntries.map(([key, value]) => ({ [key]: value })),
      };
    }

    // Includes
    if (includes.length > 0) {
      params.include = includes as TInclude[];
    }

    return params;
  }, [pageIndex, pageSize, searchValue, sorting, filters, includes]);

  return {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    filters,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
    handleFilterChange,
    setWhereFilter,
    resetFilters,
    resetAll,
  };
}

// ============================================================================
// Simple version without URL sync - GENÉRICO
// ============================================================================

export function useSimpleDataTable<
  TSortField extends string = string,
  TInclude extends string = string,
>({
  defaultPageSize = 20,
  defaultSorting = [],
  defaultIncludes = [],
}: Pick<
  UseDataTableOptions<TSortField, TInclude>,
  'defaultPageSize' | 'defaultSorting' | 'defaultIncludes'
> = {}) {
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const [sorting, setSorting] = React.useState<SortingState>(sortToTanstack(defaultSorting));
  const [searchValue, setSearchValue] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, unknown>>({});

  const handlePaginationChange = React.useCallback(
    (newPageIndex: number, newPageSize: number) => {
      if (newPageSize !== pageSize) {
        setPageIndex(0);
      } else {
        setPageIndex(newPageIndex);
      }
      setPageSize(newPageSize);
    },
    [pageSize]
  );

  const handleSortingChange = React.useCallback((newSorting: SortingState) => {
    setSorting(newSorting);
    setPageIndex(0);
  }, []);

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchValue(value);
    setPageIndex(0);
  }, []);

  const handleFilterChange = React.useCallback((key: string, value: unknown) => {
    setFilters((prev) => {
      if (value === undefined || value === null || value === '') {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
    setPageIndex(0);
  }, []);

  const queryParams = React.useMemo(() => {
    const params: {
      page: number;
      limit: number;
      search?: string;
      sort?: SortItem<TSortField>[];
      where?: WhereClause;
      include?: TInclude[];
    } = {
      page: pageIndex + 1,
      limit: pageSize,
    };

    if (searchValue) {
      params.search = searchValue;
    }

    if (sorting.length > 0) {
      params.sort = tanstackToSort<TSortField>(sorting);
    }

    const filterEntries = Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    );
    if (filterEntries.length > 0) {
      params.where = {
        and: filterEntries.map(([key, value]) => ({ [key]: value })),
      };
    }

    if (defaultIncludes.length > 0) {
      params.include = defaultIncludes;
    }

    return params;
  }, [pageIndex, pageSize, searchValue, sorting, filters, defaultIncludes]);

  return {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    filters,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
    handleFilterChange,
  };
}
