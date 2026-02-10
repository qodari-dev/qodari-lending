import React from 'react';

export type PdfComponent = React.ComponentType<Record<string, unknown>>;
export type PdfStyles = Record<string, Record<string, unknown>>;

export interface ReactPdfModule {
  Document: PdfComponent;
  Page: PdfComponent;
  Text: PdfComponent;
  View: PdfComponent;
  Image: PdfComponent;
  StyleSheet: { create: <T extends PdfStyles>(styles: T) => T };
  pdf: (element: React.ReactElement) => {
    toBuffer: () => Promise<Uint8Array>;
    toBlob: () => Promise<Blob>;
  };
}

export type PdfTemplateBuilder<TData> = (data: TData, rpdf: ReactPdfModule) => React.ReactElement;
