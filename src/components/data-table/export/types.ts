// ============================================================================
// Export Column & Config Types
// ============================================================================

/**
 * Defines how a single column maps to plain-text values for PDF/Excel export.
 * Separate from TanStack's `ColumnDef` which uses React components for rendering.
 */
export interface ExportColumn<TData> {
  /** Column header text shown in the export */
  header: string;
  /** Direct property accessor (if no custom getValue) */
  accessorKey?: keyof TData & string;
  /** Custom value extractor – returns a plain string for the cell */
  getValue?: (row: TData) => string;
  /** Generic width (used as fallback for both PDF and Excel). Prefer pdfWidth / excelWidth. */
  width?: number;
  /** Column width as percentage of page for PDF export (e.g. 15 → 15%). Takes precedence over `width`. */
  pdfWidth?: number;
  /** Column width in characters for Excel export (default: 20). Takes precedence over `width`. */
  excelWidth?: number;
  /** Text alignment within the column */
  textAlign?: 'left' | 'center' | 'right';
}

/**
 * Full export configuration for a data table page.
 */
export interface ExportConfig<TData> {
  /** Report title, e.g. "Ciudades" */
  title: string;
  /** Base filename without extension, e.g. "ciudades" */
  filename: string;
  /** Column definitions for export */
  columns: ExportColumn<TData>[];
}
