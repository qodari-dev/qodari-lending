import path from 'path';
import React from 'react';
import { ReactPdfModule } from './types';
import { createBaseStyles, BaseStyles } from './theme';

const h = React.createElement;

const COMPANY_LOGO_PATH = path.join(process.cwd(), 'public', 'company-logo.png');

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
    /** Optional footer values aligned to columns (e.g. totals row). Empty string = skip cell. */
    footerValues?: string[];
  }
): React.ReactElement {
  const { View, Text } = rpdf;
  const { columns, rows, emptyMessage, keyExtractor, tableKey = 'table', footerValues } = options;

  const colStyle = (col: TableColumn<T>) => ({
    width: col.width,
    ...(col.textAlign ? { textAlign: col.textAlign } : {}),
    ...(col.paddingRight ? { paddingRight: col.paddingRight } : {}),
  });

  const headRow = h(
    View,
    { style: styles.headRow, key: `${tableKey}-head`, fixed: true },
    ...columns.map((col, i) =>
      h(Text, { style: colStyle(col), key: `${tableKey}-th-${i}` }, col.header)
    )
  );

  if (rows.length === 0) {
    return h(
      View,
      { key: `${tableKey}-wrapper` },
      headRow,
      h(Text, { style: styles.small, key: `${tableKey}-empty` }, emptyMessage ?? 'Sin datos.')
    );
  }

  const dataRows = rows.map((row) =>
    h(
      View,
      { style: styles.row, key: keyExtractor(row), wrap: false },
      ...columns.map((col, i) =>
        h(Text, { style: colStyle(col), key: `${keyExtractor(row)}-${i}` }, col.getValue(row))
      )
    )
  );

  const children: React.ReactNode[] = [headRow, ...dataRows];

  if (footerValues) {
    children.push(
      h(
        View,
        { style: styles.footerRow, key: `${tableKey}-footer`, wrap: false },
        ...columns.map((col, i) =>
          h(
            Text,
            {
              style: { ...colStyle(col), fontWeight: 'bold' as const },
              key: `${tableKey}-ft-${i}`,
            },
            footerValues[i] ?? ''
          )
        )
      )
    );
  }

  return h(View, { key: `${tableKey}-wrapper` }, ...children);
}

// ---------------------------------------------------------------------------
// SummaryGrid
// ---------------------------------------------------------------------------

export type SummaryItem = { label: string; value: string };

export function SummaryGrid(
  rpdf: ReactPdfModule,
  styles: BaseStyles,
  items: SummaryItem[]
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
        h(Text, { style: styles.summaryValue }, item.value)
      )
    )
  );
}

// ---------------------------------------------------------------------------
// MetaLines
// ---------------------------------------------------------------------------

export function MetaLines(
  rpdf: ReactPdfModule,
  styles: BaseStyles,
  lines: Array<{ label: string; value: string }>
): React.ReactElement[] {
  const { Text } = rpdf;

  return lines.map((line, i) =>
    h(Text, { style: styles.metaLine, key: `meta-${i}` }, `${line.label}: ${line.value}`)
  );
}

// ---------------------------------------------------------------------------
// PageShell
// ---------------------------------------------------------------------------

export function PageShell(
  rpdf: ReactPdfModule,
  options: {
    styles?: BaseStyles;
    children: React.ReactNode[];
    pageSize?: string;
    /** Show the company logo at the top of the first page. Defaults to true. */
    showLogo?: boolean;
  }
): React.ReactElement {
  const { Document, Page, View, Image } = rpdf;
  const styles = options.styles ?? createBaseStyles(rpdf);
  const showLogo = options.showLogo ?? true;

  const pageChildren: React.ReactNode[] = [];

  if (showLogo) {
    pageChildren.push(
      h(View, { style: styles.logoHeader, key: '__logo-header', fixed: true },
        h(Image, { src: COMPANY_LOGO_PATH, style: styles.logoImage }),
      ),
    );
  }

  pageChildren.push(...options.children);

  return h(
    Document,
    null,
    h(Page, { size: options.pageSize ?? 'A4', style: styles.page }, ...pageChildren)
  );
}

// ---------------------------------------------------------------------------
// LetterBody
// ---------------------------------------------------------------------------

export function LetterBody(
  rpdf: ReactPdfModule,
  styles: BaseStyles,
  options: {
    title: string;
    paragraphs: string[];
    date: string;
    city?: string;
  }
): React.ReactElement[] {
  const { Text } = rpdf;

  const elements: React.ReactElement[] = [];

  if (options.city) {
    elements.push(
      h(Text, { style: styles.metaLine, key: 'letter-city' }, `${options.city}, ${options.date}`)
    );
  } else {
    elements.push(h(Text, { style: styles.metaLine, key: 'letter-date' }, options.date));
  }

  elements.push(
    h(Text, { style: { ...styles.title, marginTop: 16 }, key: 'letter-title' }, options.title)
  );

  options.paragraphs.forEach((p, i) => {
    elements.push(h(Text, { style: styles.legalText, key: `letter-p-${i}` }, p));
  });

  return elements;
}

// ---------------------------------------------------------------------------
// SignatureBlock (simple: name + title)
// ---------------------------------------------------------------------------

export function SignatureBlock(
  rpdf: ReactPdfModule,
  styles: BaseStyles,
  options: {
    name: string;
    title: string;
  }
): React.ReactElement {
  const { View, Text } = rpdf;

  return h(
    View,
    { style: { marginTop: 48 } },
    h(View, { style: styles.signatureLine }),
    h(Text, { style: { fontSize: 10 } }, options.name),
    h(Text, { style: styles.small }, options.title)
  );
}

// ---------------------------------------------------------------------------
// SignatureField (multi-field: label + fields like name, doc, address)
// ---------------------------------------------------------------------------

export type SignatureFieldItem = { label: string; value?: string };

export function SignatureField(
  rpdf: ReactPdfModule,
  styles: BaseStyles,
  options: {
    title: string;
    fields: SignatureFieldItem[];
    showSignatureLine?: boolean;
    showFingerprint?: boolean;
  }
): React.ReactElement {
  const { View, Text } = rpdf;
  const { title, fields, showSignatureLine = true, showFingerprint = false } = options;

  const children: React.ReactNode[] = [
    h(Text, { style: { fontWeight: 'bold' as const, fontSize: 10, marginBottom: 4 } }, title),
  ];

  for (const field of fields) {
    children.push(h(Text, { style: { fontSize: 9 } }, `${field.label}: ${field.value ?? ''}`));
  }

  if (showSignatureLine) {
    children.push(
      h(Text, { style: { fontSize: 9, marginTop: 8 } }, 'Firma: _______________________________')
    );
  }

  if (showFingerprint) {
    children.push(
      h(
        Text,
        { style: { fontSize: 8, marginTop: 16, textAlign: 'center' as const } },
        'Huella Dactilar'
      )
    );
  }

  return h(View, null, ...children);
}

// ---------------------------------------------------------------------------
// SignatureRow (wraps multiple SignatureFields side by side)
// ---------------------------------------------------------------------------

export function SignatureRow(
  rpdf: ReactPdfModule,
  styles: BaseStyles,
  columns: React.ReactElement[]
): React.ReactElement {
  const { View } = rpdf;
  return h(View, { style: styles.signatureRow }, ...columns);
}

// ---------------------------------------------------------------------------
// HorizontalRule
// ---------------------------------------------------------------------------

export function HorizontalRule(rpdf: ReactPdfModule, styles: BaseStyles): React.ReactElement {
  const { View } = rpdf;
  return h(View, { style: styles.hr });
}
