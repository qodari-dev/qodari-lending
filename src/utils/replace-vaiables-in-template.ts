type ReplaceVariablesInTemplateOptions = {
  strict?: boolean;
};

export function replaceVariablesInTemplate(
  template: string,
  variables: Record<string, string>,
  options?: ReplaceVariablesInTemplateOptions
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, variableKey: string) => {
    if (!Object.hasOwn(variables, variableKey)) {
      if (options?.strict) {
        throw new Error(`Variable de plantilla no soportada: ${variableKey}`);
      }
      return '';
    }

    return variables[variableKey] ?? '';
  });
}
