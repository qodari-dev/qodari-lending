import type { FieldErrors, FieldValues } from 'react-hook-form';
import { toast } from 'sonner';

/**
 * Extrae todos los mensajes de error de un objeto FieldErrors (incluyendo nested)
 */
function extractErrorMessages(
  errors: FieldErrors,
  parentPath = ''
): { path: string; message: string }[] {
  const messages: { path: string; message: string }[] = [];

  for (const [key, value] of Object.entries(errors)) {
    const path = parentPath ? `${parentPath}.${key}` : key;

    if (value?.message && typeof value.message === 'string') {
      messages.push({ path, message: value.message });
    } else if (value?.root?.message) {
      // Para arrays con error en root
      messages.push({ path, message: value.root.message as string });
    } else if (typeof value === 'object' && value !== null) {
      // Nested errors (objetos o arrays)
      messages.push(...extractErrorMessages(value as FieldErrors, path));
    }
  }

  return messages;
}

/**
 * Muestra errores de formulario en un toast
 */
export function onSubmitError<T extends FieldValues>(errors: FieldErrors<T>) {
  const errorMessages = extractErrorMessages(errors);

  if (errorMessages.length === 0) return;

  if (errorMessages.length === 1) {
    // Un solo error - toast simple
    toast.error(errorMessages[0].message, {
      description: errorMessages[0].path,
    });
    return;
  }

  // Múltiples errores - toast con lista
  toast.error('Validation errors:', {
    description: (
      <ul className="mt-2 list-disc pl-4">
        {errorMessages.slice(0, 8).map(({ path, message }) => (
          <li key={path}>
            <b>{path}:</b> {message}
          </li>
        ))}
        {errorMessages.length > 8 && <li>+{errorMessages.length - 5} more errors</li>}
      </ul>
    ),
  });
}
