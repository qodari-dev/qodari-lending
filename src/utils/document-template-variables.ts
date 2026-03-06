export const DOCUMENT_TEMPLATE_VARIABLES = [
  'credit_number',
  'monto_credito',
  'monto_total_credito',
  'valor_seguro',
  'valor_cuota',
  'numero_cuotas',
  'fecha_credito',
  'fecha_primer_pago',
  'fecha_vencimiento_final',
  'estado_credito',
  'estado_desembolso',
  'fecha_impresion',
  'titular_nombre',
  'titular_documento',
  'titular_direccion',
  'titular_telefono',
  'titular_email',
  'convenio_nombre',
  'convenio_nit',
  'convenio_direccion',
  'convenio_telefono',
  'linea_credito_id',
  'linea_credito',
  'tasa_financiacion',
  'salario_base',
  'categoria_trabajador',
] as const;

export type DocumentTemplateVariable = (typeof DOCUMENT_TEMPLATE_VARIABLES)[number];

const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function extractTemplateVariables(template: string): string[] {
  const values = new Set<string>();

  for (const match of template.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const variable = match[1];
    if (variable) {
      values.add(variable);
    }
  }

  return [...values];
}

export function findUnknownTemplateVariables(template: string): string[] {
  const allowed = new Set<string>(DOCUMENT_TEMPLATE_VARIABLES);
  return extractTemplateVariables(template).filter((value) => !allowed.has(value));
}
