'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';

interface ToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function LoanApplicationApprovalToolbar({
  searchValue,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
}: ToolbarProps) {
  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        <Input
          placeholder="Buscar por numero solicitud..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="md:max-w-xs"
        />
      </div>

      <div className="flex items-center space-x-2">
        {onRefresh ? (
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
        ) : null}
      </div>
    </div>
  );
}
