'use client';

import {
  loanPaymentStatusLabels,
  LOAN_PAYMENT_STATUS_OPTIONS,
  type LoanPaymentStatus,
} from '@/schemas/loan-payment';
import { Button } from '@/components/ui/button';
import {
  DatePickerWithRangeFilter,
  SimpleSelectFilter,
} from '@/components/data-table/data-table-faceted-filter';
import { Input } from '@/components/ui/input';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Plus, RefreshCw, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import * as React from 'react';

interface ToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter?: LoanPaymentStatus;
  onStatusFilterChange: (value: LoanPaymentStatus | undefined) => void;
  rangeDateFilter?: DateRange;
  onRangeDateFilterChange: (value: DateRange | undefined) => void;
  onReset: () => void;
  onRefresh?: () => void;
  onCreate?: () => void;
  exportActions?: React.ReactNode;
  isRefreshing?: boolean;
}

export function LoanPaymentsToolbar({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  rangeDateFilter,
  onRangeDateFilterChange,
  onReset,
  onRefresh,
  onCreate,
  exportActions,
  isRefreshing = false,
}: ToolbarProps) {
  const canCreate = useHasPermission('loan-payments:create');

  const isFiltered = Boolean(searchValue) || Boolean(statusFilter) || Boolean(rangeDateFilter?.from);

  const statusOptions = LOAN_PAYMENT_STATUS_OPTIONS.map((status) => ({
    label: loanPaymentStatusLabels[status],
    value: status,
  }));

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        <Input
          placeholder="Buscar por recibo..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="md:max-w-xs"
        />
        <DatePickerWithRangeFilter value={rangeDateFilter} onValueChange={onRangeDateFilterChange} />
        <SimpleSelectFilter
          title="Estado"
          options={statusOptions}
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange(value as LoanPaymentStatus | undefined)}
        />
        {isFiltered && (
          <Button variant="ghost" onClick={onReset} className="h-9 px-2 lg:px-3">
            Limpiar
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
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
            Refresh
          </Button>
        )}

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
