export function replaceVariablesInTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, variableKey: string) => {
    return variables[variableKey] ?? '';
  });
}
