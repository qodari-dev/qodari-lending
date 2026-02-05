import { useCallback, useMemo } from 'react';

/**
 * Hook genérico para preparar los datos de un Combobox.
 *
 * Encapsula el patrón repetitivo de:
 * 1. Extraer IDs como strings
 * 2. Crear mapa de id → label
 * 3. Crear función getLabel
 *
 * @example
 * const { items, getLabel } = useComboboxItems(
 *   cities,
 *   (city) => city.id,
 *   (city) => `${city.code} - ${city.name}`
 * );
 */
export function useComboboxItems<T>(
  data: T[],
  getId: (item: T) => string | number,
  formatLabel: (item: T) => string
) {
  const items = useMemo(() => data.map((item) => String(getId(item))), [data, getId]);

  const labelsMap = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((item) => {
      map.set(String(getId(item)), formatLabel(item));
    });
    return map;
  }, [data, getId, formatLabel]);

  const getLabel = useCallback(
    (value: string | null) => {
      if (!value) return '';
      return labelsMap.get(value) ?? value;
    },
    [labelsMap]
  );

  return { items, getLabel };
}
