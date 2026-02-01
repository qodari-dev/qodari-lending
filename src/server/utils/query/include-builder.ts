// ============================================
// TIPOS BASE
// ============================================

/**
 * Define la estructura mínima esperada para la configuración de findMany.
 */
type FindManyConfigBase = {
  with?: unknown;
  columns?: unknown;
};

/**
 * Extrae el tipo del config de findMany usando conditional types.
 */
type ExtractFindManyConfig<T> = T extends { findMany: (config?: infer C) => unknown }
  ? C extends FindManyConfigBase
    ? C
    : never
  : never;

// ============================================
// TIPOS GENÉRICOS PARA QUERIES
// ============================================

export type WithConfigOf<TQuery> = NonNullable<ExtractFindManyConfig<TQuery>>['with'];
export type RelationKeysOf<TQuery> = keyof NonNullable<WithConfigOf<TQuery>>;

export type RelationConfigOf<TQuery, TRelation extends RelationKeysOf<TQuery>> = NonNullable<
  WithConfigOf<TQuery>
>[TRelation];

export type ColumnsConfigOf<TQuery> = NonNullable<ExtractFindManyConfig<TQuery>>['columns'];

// ============================================
// HELPERS PARA COLUMNS (Sin cambios)
// ============================================

export function selectCols<TQuery>() {
  return <TCols extends keyof NonNullable<ColumnsConfigOf<TQuery>>>(
    ...columns: TCols[]
  ): Record<TCols, true> => {
    return Object.fromEntries(columns.map((c) => [c, true])) as Record<TCols, true>;
  };
}

export function excludeCols<TQuery>() {
  return <TCols extends keyof NonNullable<ColumnsConfigOf<TQuery>>>(
    ...columns: TCols[]
  ): Record<TCols, false> => {
    return Object.fromEntries(columns.map((c) => [c, false])) as Record<TCols, false>;
  };
}

// ============================================
// HELPER PARA INCLUDE MAP (Sin cambios)
// ============================================

export type TypedIncludeMapping<TQuery, TRelation extends RelationKeysOf<TQuery>> = {
  relation: TRelation;
  config: RelationConfigOf<TQuery, TRelation>;
};

export function createIncludeMap<TQuery>() {
  return <
    TApiNames extends string,
    TMap extends {
      [K in TApiNames]: TypedIncludeMapping<TQuery, RelationKeysOf<TQuery>>;
    },
  >(
    map: TMap
  ): TMap => map;
}

// ============================================
// HELPER PARA BUILD INCLUDES (CORREGIDO)
// ============================================

/**
 * Build includes con el tipo correcto de retorno
 */
export function buildTypedIncludes<
  TQuery,
  TApiNames extends string,
  TMap extends Record<TApiNames, { relation: RelationKeysOf<TQuery>; config: unknown }>,
>(includes: TApiNames[] | undefined, map: TMap): NonNullable<WithConfigOf<TQuery>> | undefined {
  if (!includes?.length) return undefined;

  const result: Record<string, unknown> = {};

  for (const key of includes) {
    const mapping = map[key];
    if (mapping) {
      result[mapping.relation as string] = mapping.config;
    }
  }

  return Object.keys(result).length > 0 ? (result as NonNullable<WithConfigOf<TQuery>>) : undefined;
}
