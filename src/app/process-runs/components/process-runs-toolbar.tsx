'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';

interface ProcessRunsToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function ProcessRunsToolbar({
  searchValue,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
}: ProcessRunsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Input
        placeholder="Buscar por usuario, nota o tipo..."
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        className="sm:max-w-sm"
      />
      <Button type="button" variant="outline" onClick={onRefresh} disabled={isRefreshing}>
        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        Actualizar
      </Button>
    </div>
  );
}
