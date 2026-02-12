import ExcelJS from 'exceljs';
import { ExportConfig } from './types';
import { triggerDownload } from './download';

/**
 * Generates an Excel (.xlsx) file client-side and triggers a download.
 * Layout: Row 1 = title (merged), Row 2 = spacer, Row 3 = column headers, Row 4+ = data.
 */
export async function exportToExcel<TData>(
  config: ExportConfig<TData>,
  data: TData[],
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(config.title);
  const colCount = config.columns.length;

  // Set column widths
  config.columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width ?? 20;
  });

  // Row 1: Title (merged across all columns)
  worksheet.mergeCells(1, 1, 1, colCount);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = config.title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { vertical: 'middle' };

  // Row 2: empty spacer (default)

  // Row 3: Column headers
  const headerRow = worksheet.getRow(3);
  config.columns.forEach((col, idx) => {
    headerRow.getCell(idx + 1).value = col.header;
  });
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' },
  };
  headerRow.alignment = { vertical: 'middle' };

  // Row 4+: Data rows
  for (const item of data) {
    const values = config.columns.map((col) =>
      col.getValue
        ? col.getValue(item)
        : String((item as Record<string, unknown>)[col.accessorKey ?? col.header] ?? ''),
    );
    worksheet.addRow(values);
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `${config.filename}.xlsx`);
}
