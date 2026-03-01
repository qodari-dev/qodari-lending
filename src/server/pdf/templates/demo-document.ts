import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell } from '../components';

const h = React.createElement;

export type DemoDocumentData = {
  title: string;
  lines: string[];
};

export const demoDocumentTemplate: PdfTemplateBuilder<DemoDocumentData> = (data, rpdf) => {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);

  return PageShell(rpdf, {
    styles,
    children: [
      h(Text, { style: styles.title, key: 'title' }, data.title),
      ...data.lines.map((line, i) =>
        h(Text, { style: styles.metaLine, key: `line-${i}` }, line),
      ),
    ],
  });
};
