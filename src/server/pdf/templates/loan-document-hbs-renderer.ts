import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import Handlebars from 'handlebars';
import { chromium, type Browser } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BASE_LAYOUT_TEMPLATE = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 22mm 16mm 24mm 16mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.5;
        color: #111827;
      }
      h1, h2, h3 { margin: 0 0 10px; line-height: 1.25; }
      h1 { font-size: 20px; }
      h2 { font-size: 16px; }
      h3 { font-size: 14px; }
      p { margin: 0 0 8px; }
      ul, ol { margin: 0 0 8px 18px; padding: 0; }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
      }
      table th, table td {
        border: 1px solid #d1d5db;
        padding: 6px 8px;
        font-size: 11px;
        vertical-align: top;
      }
      .document-content {
        width: 100%;
      }
    </style>
  </head>
  <body>
    <main class="document-content">
      {{{content}}}
    </main>
  </body>
</html>`;

let browserPromise: Promise<Browser> | null = null;
let companyLogoDataUri: string | null = null;

function getBrowser() {
  if (!browserPromise) {
    const promise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    browserPromise = promise;
    // If launch fails, reset so the next call retries instead of being stuck
    // with a rejected promise forever.
    promise.catch(() => {
      if (browserPromise === promise) browserPromise = null;
    });
  }
  return browserPromise;
}

function readCompanyLogoDataUri() {
  if (companyLogoDataUri !== null) return companyLogoDataUri;
  try {
    const filePath = path.resolve(process.cwd(), 'public', 'company-logo.png');
    const file = readFileSync(filePath);
    companyLogoDataUri = `data:image/png;base64,${file.toString('base64')}`;
    return companyLogoDataUri;
  } catch {
    companyLogoDataUri = '';
    return companyLogoDataUri;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildHeaderTemplate(args: { documentName: string; creditNumber: string; printDate: string }) {
  const logo = readCompanyLogoDataUri();
  const documentName = escapeHtml(args.documentName);
  const creditNumber = escapeHtml(args.creditNumber);
  const printDate = escapeHtml(args.printDate);
  const logoHtml = logo
    ? `<img src="${logo}" alt="logo" style="height:30px;object-fit:contain;" />`
    : `<div style="font-size:11px;font-weight:700;">Qodari Lending</div>`;

  return `
    <div style="width:100%;padding:0 16mm;font-family:Arial,sans-serif;font-size:10px;color:#6b7280;">
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;border-bottom:1px solid #e5e7eb;padding:6px 0;">
        <div>${logoHtml}</div>
        <div style="text-align:right;">
          <div style="font-size:11px;font-weight:700;color:#111827;">${documentName}</div>
          <div>Crédito: ${creditNumber}</div>
          <div>Fecha: ${printDate}</div>
        </div>
      </div>
    </div>
  `;
}

function buildFooterTemplate() {
  return `
    <div style="width:100%;padding:0 16mm;font-family:Arial,sans-serif;font-size:10px;color:#6b7280;">
      <div style="display:flex;justify-content:space-between;width:100%;border-top:1px solid #e5e7eb;padding:6px 0;">
        <span>Direccion: Carrera 00 #00-00, Barranquilla - Colombia</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    </div>
  `;
}

export async function renderHandlebarsTemplateToPdfBuffer(args: {
  templateBody: string;
  variables: Record<string, string>;
  documentName: string;
  creditNumber: string;
  printDate: string;
}): Promise<Buffer> {
  const contentTemplate = Handlebars.compile(args.templateBody, { strict: true });
  const contentHtml = contentTemplate(args.variables);
  const baseTemplate = Handlebars.compile(BASE_LAYOUT_TEMPLATE);
  const fullHtml = baseTemplate({
    content: contentHtml,
  });

  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    throwHttpError({
      status: 500,
      message: `No fue posible iniciar el navegador para generar PDF: ${message}`,
      code: 'INTERNAL_ERROR',
    });
  }

  const page = await browser.newPage();
  try {
    await page.setContent(fullHtml, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: buildHeaderTemplate({
        documentName: args.documentName,
        creditNumber: args.creditNumber,
        printDate: args.printDate,
      }),
      footerTemplate: buildFooterTemplate(),
      margin: {
        top: '32mm',
        right: '14mm',
        bottom: '26mm',
        left: '14mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al renderizar plantilla';
    throwHttpError({
      status: 500,
      message: `No fue posible renderizar la plantilla HTML/HBS: ${message}`,
      code: 'INTERNAL_ERROR',
    });
  } finally {
    await page.close().catch(() => {});
  }
}
