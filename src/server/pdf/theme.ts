import { ReactPdfModule } from './types';

export const pdfColors = {
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  bgLight: '#f3f4f6',
  headerBorder: '#9ca3af',
} as const;

export const pdfFontSizes = {
  title: 16,
  section: 12,
  body: 10,
  value: 11,
  small: 9,
  legal: 9,
  label: 10,
  formLabel: 9,
} as const;

export const pdfSpacing = {
  page: 24,
  sectionGap: 12,
  itemGap: 6,
  cardPadding: 6,
  rowPaddingV: 3,
  headRowPaddingV: 4,
} as const;

export function createBaseStyles(rpdf: ReactPdfModule) {
  return rpdf.StyleSheet.create({
    page: {
      padding: pdfSpacing.page,
      fontSize: pdfFontSizes.body,
      color: pdfColors.text,
    },
    title: {
      fontSize: pdfFontSizes.title,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: pdfFontSizes.section,
      marginTop: pdfSpacing.sectionGap,
      marginBottom: pdfSpacing.itemGap,
    },
    metaLine: {
      marginBottom: 2,
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: pdfColors.border,
      paddingVertical: pdfSpacing.rowPaddingV,
    },
    headRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: pdfColors.headerBorder,
      paddingVertical: pdfSpacing.headRowPaddingV,
      backgroundColor: pdfColors.bgLight,
    },
    footerRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: pdfColors.text,
      paddingVertical: pdfSpacing.rowPaddingV,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: pdfSpacing.itemGap,
      marginTop: pdfSpacing.itemGap,
    },
    summaryCard: {
      width: '32%',
      borderWidth: 1,
      borderColor: pdfColors.border,
      borderRadius: 4,
      padding: pdfSpacing.cardPadding,
    },
    summaryLabel: {
      fontSize: pdfFontSizes.small,
      color: pdfColors.muted,
    },
    summaryValue: {
      fontSize: pdfFontSizes.value,
      marginTop: 2,
    },
    small: {
      fontSize: pdfFontSizes.small,
      color: pdfColors.muted,
    },
    // -- Loan document styles (legal text, forms, labels) --
    legalText: {
      marginBottom: 6,
      lineHeight: 1.5,
      fontSize: pdfFontSizes.legal,
      textAlign: 'justify',
    },
    labelText: {
      marginBottom: 2,
      fontSize: pdfFontSizes.label,
    },
    sectionHeader: {
      fontSize: pdfFontSizes.label,
      fontWeight: 'bold',
      marginTop: 10,
      marginBottom: 4,
      textAlign: 'center',
    },
    formLabel: {
      fontWeight: 'bold',
      fontSize: pdfFontSizes.formLabel,
    },
    formCell: {
      borderBottomWidth: 1,
      borderBottomColor: pdfColors.border,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    hr: {
      borderBottomWidth: 1,
      borderBottomColor: pdfColors.text,
      marginVertical: 8,
    },
    signatureLine: {
      borderBottomWidth: 1,
      borderBottomColor: pdfColors.text,
      width: 200,
      marginBottom: 4,
    },
    twoColumnRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    signatureRow: {
      flexDirection: 'row',
      marginTop: 20,
      gap: 40,
    },
    signatureColumn: {
      width: '45%',
    },
    // -- Logo header --
    logoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: pdfColors.border,
    },
    logoImage: {
      width: 56,
      height: 56,
    },
  });
}

export type BaseStyles = ReturnType<typeof createBaseStyles>;
