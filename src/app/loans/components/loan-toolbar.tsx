'use client';

import {
  loanStatusLabels,
  LOAN_STATUS_OPTIONS,
  type LoanStatus,
} from '@/schemas/loan';
import { Button } from '@/components/ui/button';
import {
  DatePickerWithRangeFilter,
  SimpleSelectFilter,
} from '@/components/data-table/data-table-faceted-filter';
import { Input } from '@/components/ui/input';
import { RefreshCw, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface ToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter?: LoanStatus;
  onStatusFilterChange: (value: LoanStatus | undefined) => void;
  rangeDateFilter?: DateRange;
  onRangeDateFilterChange: (value: DateRange | undefined) => void;
  onReset: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function LoansToolbar({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  rangeDateFilter,
  onRangeDateFilterChange,
  onReset,
  onRefresh,
  isRefreshing = false,
}: ToolbarProps) {
  const isFiltered = Boolean(searchValue) || Boolean(statusFilter) || Boolean(rangeDateFilter?.from);

  const statusOptions = LOAN_STATUS_OPTIONS.map((status) => ({
    label: loanStatusLabels[status],
    value: status,
  }));

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        <Input
          placeholder="Buscar por numero credito..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="md:max-w-xs"
        />
        <DatePickerWithRangeFilter value={rangeDateFilter} onValueChange={onRangeDateFilterChange} />
        <SimpleSelectFilter
          title="Estado"
          options={statusOptions}
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange(value as LoanStatus | undefined)}
        />
        {isFiltered && (
          <Button variant="ghost" onClick={onReset} className="h-9 px-2 lg:px-3">
            Limpiar
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
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
      </div>
    </div>
  );
}
