import { ExportConfig } from './types';
import { triggerDownload } from './download';

/**
 * Pre-computes row values and sends them to the generic PDF export API route.
 * The server renders the PDF using @react-pdf/renderer and returns a blob.
 */
export async function exportToPdf<TData>(
  config: ExportConfig<TData>,
  data: TData[],
) {
  // Pre-compute string values from data
  const rows = data.map((item) =>
    config.columns.map((col) =>
      col.getValue
        ? col.getValue(item)
        : String((item as Record<string, unknown>)[col.accessorKey ?? ''] ?? ''),
    ),
  );

  const response = await fetch('/api/v1/export/pdf', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: config.title,
      filename: config.filename,
      columns: config.columns.map((c) => ({
        header: c.header,
        width: c.width,
        textAlign: c.textAlign,
      })),
      rows,
      totalCount: data.length,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      (errorBody as { body?: { message?: string } })?.body?.message
        ?? 'Error al generar PDF',
    );
  }

  const blob = await response.blob();
  triggerDownload(blob, `${config.filename}.pdf`);
}
