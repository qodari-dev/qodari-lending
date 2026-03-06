export const BILLING_EMAIL_TEMPLATE_VARIABLES = [
  'nit',
  'razon_social',
  'direccion',
  'telefono',
  'convenio_codigo',
  'ciclo',
  'dia_corte',
  'dia_envio',
  'dia_pago_esperado',
  'periodo',
  'fecha_envio',
] as const;

export type BillingEmailTemplateVariable = (typeof BILLING_EMAIL_TEMPLATE_VARIABLES)[number];

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
  const allowed = new Set<string>(BILLING_EMAIL_TEMPLATE_VARIABLES);
  return extractTemplateVariables(template).filter((value) => !allowed.has(value));
}
