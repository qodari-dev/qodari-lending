import { NextResponse } from 'next/server';
import { loadReactPdf } from './load-react-pdf';
import { sanitizeFilename } from './format';
import { PdfTemplateBuilder } from './types';

export async function renderTemplate<TData>(
  data: TData,
  template: PdfTemplateBuilder<TData>,
  filename: string,
): Promise<NextResponse> {
  const rpdf = await loadReactPdf();
  const document = template(data, rpdf);
  const blob = await rpdf.pdf(document).toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  const safeFilename = sanitizeFilename(filename);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** Renders a template and returns the result as a base64-encoded string. */
export async function renderTemplateToBase64<TData>(
  data: TData,
  template: PdfTemplateBuilder<TData>,
): Promise<string> {
  const rpdf = await loadReactPdf();
  const document = template(data, rpdf);
  const blob = await rpdf.pdf(document).toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString('base64');
}
