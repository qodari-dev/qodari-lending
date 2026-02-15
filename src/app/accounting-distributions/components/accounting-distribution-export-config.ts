import { ExportConfig } from '@/components/data-table/export';
import { AccountingDistribution } from '@/schemas/accounting-distribution';
import { formatDate, formatPercent } from '@/utils/formatters';

function totals(row: AccountingDistribution) {
  return (row.accountingDistributionLines ?? []).reduce(
    (acc, line) => {
      const value = Number(line.percentage) || 0;
      if (line.nature === 'DEBIT') acc.debit += value;
      if (line.nature === 'CREDIT') acc.credit += value;
      return acc;
    },
    { debit: 0, credit: 0 }
  );
}

function formatLinesByNature(row: AccountingDistribution, nature: 'DEBIT' | 'CREDIT') {
  const lines = (row.accountingDistributionLines ?? []).filter((line) => line.nature === nature);
  if (!lines.length) return '-';
  return lines
    .map((line) => {
      const account = line.glAccount
        ? `${line.glAccount.code}-${line.glAccount.name}`
        : String(line.glAccountId);
      const center = line.costCenter
        ? `${line.costCenter.code}-${line.costCenter.name}`
        : '-';
      return `${account} [CC:${center}] ${formatPercent(line.percentage, 2)}`;
    })
    .join(' | ');
}

export const accountingDistributionExportConfig: ExportConfig<AccountingDistribution> = {
  title: 'Distribuciones Contables',
  filename: 'distribuciones-contables',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
    {
      header: 'Estado',
      accessorKey: 'isActive',
      getValue: (row) => (row.isActive ? 'Activo' : 'Inactivo'),
    },
    {
      header: 'Total Debito %',
      getValue: (row) => formatPercent(totals(row).debit, 2),
    },
    {
      header: 'Total Credito %',
      getValue: (row) => formatPercent(totals(row).credit, 2),
    },
    {
      header: 'Cuadrada',
      getValue: (row) => {
        const summary = totals(row);
        const epsilon = 0.01;
        const debitOk = Math.abs(summary.debit - 100) <= epsilon;
        const creditOk = Math.abs(summary.credit - 100) <= epsilon;
        return debitOk && creditOk ? 'Si' : 'No';
      },
    },
    {
      header: 'Lineas Debito',
      getValue: (row) => formatLinesByNature(row, 'DEBIT'),
      width: 50,
    },
    {
      header: 'Lineas Credito',
      getValue: (row) => formatLinesByNature(row, 'CREDIT'),
      width: 50,
    },
    {
      header: 'Creado',
      accessorKey: 'createdAt',
      getValue: (row) => formatDate(row.createdAt),
    },
    {
      header: 'Actualizado',
      accessorKey: 'updatedAt',
      getValue: (row) => formatDate(row.updatedAt),
    },
  ],
};
