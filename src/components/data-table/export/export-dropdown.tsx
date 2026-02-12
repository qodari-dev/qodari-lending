'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ExportConfig } from './types';
import { exportToExcel } from './export-excel';
import { exportToPdf } from './export-pdf';

// ============================================================================
// Props Interface
// ============================================================================

interface ExportDropdownProps<TData> {
  config: ExportConfig<TData>;
  fetchAllData: () => Promise<TData[]>;
}

// ============================================================================
// Main Component
// ============================================================================

export function ExportDropdown<TData>({
  config,
  fetchAllData,
}: ExportDropdownProps<TData>) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = React.useCallback(
    async (format: 'pdf' | 'excel') => {
      setIsExporting(true);
      try {
        const data = await fetchAllData();

        if (data.length === 0) {
          toast.warning('No hay datos para exportar.');
          return;
        }

        if (format === 'excel') {
          await exportToExcel(config, data);
        } else {
          await exportToPdf(config, data);
        }

        toast.success(
          `Reporte ${format === 'excel' ? 'Excel' : 'PDF'} generado correctamente.`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Error al generar el reporte.',
        );
      } finally {
        setIsExporting(false);
      }
    },
    [config, fetchAllData],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting} className="h-9">
          {isExporting ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
