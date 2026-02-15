'use client';

import { triggerDownload } from '@/components/data-table/export/download';

export function downloadPdfFromBase64(pdfBase64: string, fileName: string) {
  const bytes = Uint8Array.from(atob(pdfBase64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  triggerDownload(blob, fileName);
}
