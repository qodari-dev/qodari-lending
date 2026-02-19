'use client';

import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProcessRun } from '@/schemas/process-run';
import { formatDate, formatDateTime } from '@/utils/formatters';

export function ProcessRunInfo({
  processRun,
  opened,
  onOpened,
}: {
  processRun: ProcessRun | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!processRun) return null;
  const accountingPeriodLabel = processRun.accountingPeriod
    ? `${processRun.accountingPeriod.year}-${String(processRun.accountingPeriod.month).padStart(2, '0')}`
    : processRun.accountingPeriodId;

  const sections: DescriptionSection[] = [
    {
      title: 'General',
      columns: 2,
      items: [
        { label: 'Run', value: processRun.id },
        { label: 'Tipo', value: processRun.processType },
        { label: 'Estado', value: processRun.status },
        { label: 'Alcance', value: `${processRun.scopeType} (${processRun.scopeId})` },
        { label: 'Fecha proceso', value: formatDate(processRun.processDate) },
        { label: 'Fecha movimiento', value: formatDate(processRun.transactionDate) },
        { label: 'Periodo contable', value: accountingPeriodLabel },
        { label: 'Origen', value: processRun.triggerSource },
      ],
    },
    {
      title: 'Ejecucion',
      columns: 2,
      items: [
        { label: 'Ejecutado por', value: processRun.executedByUserName },
        { label: 'Usuario id', value: processRun.executedByUserId },
        { label: 'Fecha ejecucion', value: formatDateTime(processRun.executedAt) },
        { label: 'Inicio', value: formatDateTime(processRun.startedAt) },
        { label: 'Fin', value: formatDateTime(processRun.finishedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Corrida de proceso #{processRun.id}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <DescriptionList sections={sections} columns={2} />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Resumen</h3>
            <pre className="bg-muted max-h-80 overflow-auto rounded-md p-3 text-xs">
              {JSON.stringify(processRun.summary ?? {}, null, 2)}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Nota</h3>
            <div className="bg-muted rounded-md p-3 text-sm">{processRun.note ?? '-'}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
