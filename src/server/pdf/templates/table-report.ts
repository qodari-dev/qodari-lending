import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell, MetaLines, PdfTable, TableColumn } from '../components';

const h = React.createElement;

// ============================================================================
// Data shape for generic table report
// ============================================================================

export interface TableReportData {
  title: string;
  columns: Array<{
    header: string;
    width?: number;
    textAlign?: string;
  }>;
  rows: string[][];
  totalCount: number;
}

// ============================================================================
// Template
// ============================================================================

/** Wraps each string[] row with an index so PdfTable can use it as a key. */
interface IndexedRow {
  idx: number;
  values: string[];
}

export const tableReportTemplate: PdfTemplateBuilder<TableReportData> = (data, rpdf) => {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);

  // Build column definitions for PdfTable.
  const columnCount = data.columns.length;
  const defaultWidth = columnCount > 0 ? `${Math.floor(100 / columnCount)}%` : '100%';

  const pdfColumns: TableColumn<IndexedRow>[] = data.columns.map((col, idx) => ({
    header: col.header,
    width: col.width ? `${col.width}%` : defaultWidth,
    textAlign: col.textAlign,
    getValue: (row: IndexedRow) => row.values[idx] ?? '',
  }));

  const indexedRows: IndexedRow[] = data.rows.map((values, idx) => ({ idx, values }));

  const generatedAt = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return PageShell(rpdf, {
    children: [
      h(Text, { style: styles.title, key: 'title' }, data.title),
      ...MetaLines(rpdf, styles, [
        { label: 'Generado', value: generatedAt },
        { label: 'Total registros', value: String(data.totalCount) },
      ]),
      h(Text, { style: { marginBottom: 4 }, key: 'spacer' }, ''),
      PdfTable(rpdf, styles, {
        columns: pdfColumns,
        rows: indexedRows,
        emptyMessage: 'Sin datos.',
        keyExtractor: (row) => `row-${row.idx}`,
        tableKey: 'report',
      }),
    ],
  });
};
