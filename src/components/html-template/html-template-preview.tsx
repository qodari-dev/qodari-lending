'use client';

import { cn } from '@/lib/utils';

function buildPreviewHtml(htmlContent: string) {
  const bodyContent = htmlContent.trim() ? htmlContent : '<p>Sin contenido</p>';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:;"
    />
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #111827;
      }
      table {
        border-collapse: collapse;
      }
    </style>
  </head>
  <body>${bodyContent}</body>
</html>`;
}

export function HtmlTemplatePreview({
  htmlContent,
  className,
}: {
  htmlContent: string;
  className?: string;
}) {
  return (
    <iframe
      title="Vista previa HTML"
      sandbox=""
      className={cn('h-[320px] w-full rounded-md border bg-background', className)}
      srcDoc={buildPreviewHtml(htmlContent)}
    />
  );
}
