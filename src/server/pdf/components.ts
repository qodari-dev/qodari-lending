import React from 'react';
import { ReactPdfModule } from './types';
import { createBaseStyles, BaseStyles } from './theme';

const h = React.createElement;

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export type TableColumn<T> = {
  header: string;
  width: string;
  textAlign?: string;
  paddingRight?: number;
  getValue: (row: T) => string;
};

export function PdfTable<T>(
  rpdf: ReactPdfModule,
  styles: BaseStyles,
  options: {
    columns: TableColumn<T>[];
    rows: T[];
    emptyMessage?: string;
    keyExtractor: (row: T) => string;
    tableKey?: string;
  },
): React.ReactElement {
  const { View, Text } = rpdf;
  const { columns, rows, emptyMessage, keyExtractor, tableKey = 'table' } = options;

  const colStyle = (col: TableColumn<T>) => ({
    width: col.width,
    ...(col.textAlign ? { textAlign: col.textAlign } : {}),
    ...(col.paddingRight ? { paddingRight: col.paddingRight } : {}),
  });

  const headRow = h(
    View,
    { style: styles.headRow, key: `${tableKey}-head`, fixed: true },
    ...columns.map((col, i) => h(Text, { style: colStyle(col), key: `${tableKey}-th-${i}` }, col.header)),
  );

  if (rows.length === 0) {
    return h(
      View,
      { key: `${tableKey}-wrapper` },
      headRow,
      h(Text, { style: styles.small, key: `${tableKey}-empty` }, emptyMessage ?? 'Sin datos.'),
    );
  }

  const dataRows = rows.map((row) =>
    h(
      View,
      { style: styles.row, key: keyExtractor(row), wrap: false },
      ...columns.map((col, i) =>
        h(Text, { style: colStyle(col), key: `${keyExtractor(row)}-${i}` }, col.getValue(row)),
      ),
    ),
  );

  return h(
    View,
    { key: `${tableKey}-wrapper` },
    headRow,
    ...dataRows,
  );
}

// ---------------------------------------------------------------------------
// SummaryGrid
// ---------------------------------------------------------------------------

export type SummaryItem = { label: string; value: string };

export function SummaryGrid(
  rpdf: ReactPdfModule,
  styles: BaseStyles,
  items: SummaryItem[],
): React.ReactElement {
  const { View, Text } = rpdf;

  return h(
    View,
    { style: styles.summaryGrid },
    ...items.map((item, i) =>
      h(
        View,
        { style: styles.summaryCard, key: `summary-${i}` },
        h(Text, { style: styles.summaryLabel }, item.label),
        h(Text, { style: styles.summaryValue }, item.value),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// MetaLines
// ---------------------------------------------------------------------------

export function MetaLines(
  rpdf: ReactPdfModule,
  styles: BaseStyles,
  lines: Array<{ label: string; value: string }>,
): React.ReactElement[] {
  const { Text } = rpdf;

  return lines.map((line, i) =>
    h(Text, { style: styles.metaLine, key: `meta-${i}` }, `${line.label}: ${line.value}`),
  );
}

// ---------------------------------------------------------------------------
// PageShell
// ---------------------------------------------------------------------------

export function PageShell(
  rpdf: ReactPdfModule,
  options: {
    children: React.ReactNode[];
    pageSize?: string;
  },
): React.ReactElement {
  const { Document, Page } = rpdf;
  const styles = createBaseStyles(rpdf);

  return h(
    Document,
    null,
    h(Page, { size: options.pageSize ?? 'A4', style: styles.page }, ...options.children),
  );
}

// ---------------------------------------------------------------------------
// LetterBody
// ---------------------------------------------------------------------------

export function LetterBody(
  rpdf: ReactPdfModule,
  options: {
    title: string;
    paragraphs: string[];
    date: string;
    city?: string;
  },
): React.ReactElement[] {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);

  const elements: React.ReactElement[] = [];

  if (options.city) {
    elements.push(
      h(Text, { style: styles.metaLine, key: 'letter-city' }, `${options.city}, ${options.date}`),
    );
  } else {
    elements.push(h(Text, { style: styles.metaLine, key: 'letter-date' }, options.date));
  }

  elements.push(h(Text, { style: { ...styles.title, marginTop: 16 }, key: 'letter-title' }, options.title));

  options.paragraphs.forEach((p, i) => {
    elements.push(
      h(
        Text,
        { style: { marginBottom: 8, lineHeight: 1.5 }, key: `letter-p-${i}` },
        p,
      ),
    );
  });

  return elements;
}

// ---------------------------------------------------------------------------
// SignatureBlock
// ---------------------------------------------------------------------------

export function SignatureBlock(
  rpdf: ReactPdfModule,
  options: {
    name: string;
    title: string;
  },
): React.ReactElement {
  const { View, Text } = rpdf;
  const styles = createBaseStyles(rpdf);

  return h(
    View,
    { style: { marginTop: 48 } },
    h(View, { style: { borderTopWidth: 1, borderTopColor: '#111827', width: 200, marginBottom: 4 } }),
    h(Text, { style: { fontSize: 10 } }, options.name),
    h(Text, { style: styles.small }, options.title),
  );
}
