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
  /** Column width: percentage for PDF, character width for Excel */
  width?: number;
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
