import {
  SQL,
  and,
  or,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  ilike,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  asc,
  desc,
} from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { PaginationMeta } from './schemas';

// ============================================
// TYPES
// ============================================

export type FieldMap = Record<string, PgColumn>;

export interface QueryConfig {
  fields: FieldMap;
  searchFields?: PgColumn[];
  defaultSort?: { column: PgColumn; order: 'asc' | 'desc' };
}

// ============================================
// STRING OPERATORS
// ============================================

interface StringOps {
  eq?: string;
  ne?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  in?: string[];
  notIn?: string[];
  isNull?: true;
  isNotNull?: true;
  mode?: 'default' | 'insensitive';
}

function buildStringCondition(col: PgColumn, value: string | StringOps): SQL | undefined {
  if (typeof value === 'string') {
    return eq(col, value);
  }

  const likeFn = value.mode === 'default' ? like : ilike;

  if (value.eq !== undefined) return eq(col, value.eq);
  if (value.ne !== undefined) return ne(col, value.ne);
  if (value.contains !== undefined) return likeFn(col, `%${value.contains}%`);
  if (value.startsWith !== undefined) return likeFn(col, `${value.startsWith}%`);
  if (value.endsWith !== undefined) return likeFn(col, `%${value.endsWith}`);
  if (value.in?.length) return inArray(col, value.in);
  if (value.notIn?.length) return notInArray(col, value.notIn);
  if (value.isNull) return isNull(col);
  if (value.isNotNull) return isNotNull(col);

  return undefined;
}

// ============================================
// NUMBER OPERATORS
// ============================================

interface NumberOps {
  eq?: number;
  ne?: number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  in?: number[];
  notIn?: number[];
  isNull?: true;
  isNotNull?: true;
}

function buildNumberCondition(col: PgColumn, value: number | NumberOps): SQL | undefined {
  if (typeof value === 'number') {
    return eq(col, value);
  }

  if (value.eq !== undefined) return eq(col, value.eq);
  if (value.ne !== undefined) return ne(col, value.ne);
  if (value.gt !== undefined) return gt(col, value.gt);
  if (value.gte !== undefined) return gte(col, value.gte);
  if (value.lt !== undefined) return lt(col, value.lt);
  if (value.lte !== undefined) return lte(col, value.lte);
  if (value.in?.length) return inArray(col, value.in);
  if (value.notIn?.length) return notInArray(col, value.notIn);
  if (value.isNull) return isNull(col);
  if (value.isNotNull) return isNotNull(col);

  return undefined;
}

// ============================================
// BOOLEAN OPERATORS
// ============================================

interface BooleanOps {
  eq?: boolean;
  ne?: boolean;
  isNull?: true;
  isNotNull?: true;
}

function buildBooleanCondition(col: PgColumn, value: boolean | BooleanOps): SQL | undefined {
  if (typeof value === 'boolean') {
    return eq(col, value);
  }

  if (value.eq !== undefined) return eq(col, value.eq);
  if (value.ne !== undefined) return ne(col, value.ne);
  if (value.isNull) return isNull(col);
  if (value.isNotNull) return isNotNull(col);

  return undefined;
}

// ============================================
// DATE OPERATORS
// ============================================

interface DateOps {
  eq?: Date;
  ne?: Date;
  gt?: Date;
  gte?: Date;
  lt?: Date;
  lte?: Date;
  isNull?: true;
  isNotNull?: true;
}

function buildDateCondition(col: PgColumn, value: Date | DateOps): SQL | undefined {
  if (value instanceof Date) {
    return eq(col, value);
  }

  const conditions: SQL[] = [];

  if (value.eq) conditions.push(eq(col, value.eq));
  if (value.ne) conditions.push(ne(col, value.ne));
  if (value.gt) conditions.push(gt(col, value.gt));
  if (value.gte) conditions.push(gte(col, value.gte));
  if (value.lt) conditions.push(lt(col, value.lt));
  if (value.lte) conditions.push(lte(col, value.lte));
  if (value.isNull) conditions.push(isNull(col));
  if (value.isNotNull) conditions.push(isNotNull(col));

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

// ============================================
// ENUM OPERATORS
// ============================================

interface EnumOps<T extends string = string> {
  eq?: T;
  ne?: T;
  in?: T[];
  notIn?: T[];
  isNull?: true;
  isNotNull?: true;
}

function buildEnumCondition<T extends string>(
  col: PgColumn,
  value: T | EnumOps<T>
): SQL | undefined {
  if (typeof value === 'string') {
    return eq(col, value);
  }

  if (value.eq !== undefined) return eq(col, value.eq);
  if (value.ne !== undefined) return ne(col, value.ne);
  if (value.in?.length) return inArray(col, value.in);
  if (value.notIn?.length) return notInArray(col, value.notIn);
  if (value.isNull) return isNull(col);
  if (value.isNotNull) return isNotNull(col);

  return undefined;
}

// ============================================
// GENERIC FIELD CONDITION
// ============================================

type FieldValue =
  | string
  | number
  | boolean
  | Date
  | StringOps
  | NumberOps
  | BooleanOps
  | DateOps
  | EnumOps;

export function buildFieldCondition(col: PgColumn, value: FieldValue): SQL | undefined {
  if (value === undefined || value === null) return undefined;

  // Direct values
  if (typeof value === 'string') return buildStringCondition(col, value);
  if (typeof value === 'number') return buildNumberCondition(col, value);
  if (typeof value === 'boolean') return buildBooleanCondition(col, value);
  if (value instanceof Date) return buildDateCondition(col, value);

  // Object with operators
  if (typeof value === 'object') {
    // String-specific
    if ('contains' in value || 'startsWith' in value || 'endsWith' in value || 'mode' in value) {
      return buildStringCondition(col, value as StringOps);
    }
    // Comparison operators - could be number or date
    if ('gt' in value || 'gte' in value || 'lt' in value || 'lte' in value) {
      const sample = value.gt ?? value.gte ?? value.lt ?? value.lte ?? value.eq;
      if (sample instanceof Date) return buildDateCondition(col, value as DateOps);
      return buildNumberCondition(col, value as NumberOps);
    }
    // eq type detection
    if ('eq' in value && value.eq !== undefined) {
      if (typeof value.eq === 'boolean') return buildBooleanCondition(col, value as BooleanOps);
      if (value.eq instanceof Date) return buildDateCondition(col, value as DateOps);
      if (typeof value.eq === 'number') return buildNumberCondition(col, value as NumberOps);
      return buildStringCondition(col, value as StringOps);
    }
    // in/notIn
    if ('in' in value || 'notIn' in value) {
      const arr = value.in ?? value.notIn;
      if (Array.isArray(arr) && arr.length > 0) {
        if (typeof arr[0] === 'number') return buildNumberCondition(col, value as NumberOps);
        return buildEnumCondition(col, value as EnumOps);
      }
    }
    // isNull/isNotNull only
    if ('isNull' in value || 'isNotNull' in value) {
      return buildBooleanCondition(col, value as BooleanOps);
    }
  }

  return undefined;
}

// ============================================
// BUILD CONDITIONS FROM FIELDS
// ============================================

export function buildFieldsConditions(
  fields: Record<string, FieldValue | undefined>,
  fieldMap: FieldMap
): SQL[] {
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const col = fieldMap[key];
    if (!col) continue;

    const condition = buildFieldCondition(col, value);
    if (condition) conditions.push(condition);
  }

  return conditions;
}

// ============================================
// BUILD WHERE (and/or)
// ============================================

interface WhereInput {
  and?: Record<string, FieldValue | undefined>[];
  or?: Record<string, FieldValue | undefined>[];
}

/**
 * Build WHERE from { and: [...], or: [...] }
 *
 * Logic: (AND conditions) AND (OR group)
 */
export function buildWhere(where: WhereInput | undefined, fieldMap: FieldMap): SQL | undefined {
  if (!where) return undefined;

  const parts: SQL[] = [];

  // AND array
  if (where.and?.length) {
    const andConditions: SQL[] = [];
    for (const item of where.and) {
      andConditions.push(...buildFieldsConditions(item, fieldMap));
    }
    if (andConditions.length) {
      parts.push(and(...andConditions)!);
    }
  }

  // OR array (each item's fields are ANDed, then ORed together)
  if (where.or?.length) {
    const orConditions: SQL[] = [];
    for (const item of where.or) {
      const itemConditions = buildFieldsConditions(item, fieldMap);
      if (itemConditions.length === 1) {
        orConditions.push(itemConditions[0]);
      } else if (itemConditions.length > 1) {
        orConditions.push(and(...itemConditions)!);
      }
    }
    if (orConditions.length) {
      parts.push(or(...orConditions)!);
    }
  }

  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return and(...parts);
}

// ============================================
// BUILD SEARCH
// ============================================

export function buildSearch(term: string | undefined, searchFields: PgColumn[]): SQL | undefined {
  if (!term || !searchFields.length) return undefined;

  const conditions = searchFields.map((col) => ilike(col, `%${term}%`));
  return conditions.length === 1 ? conditions[0] : or(...conditions);
}

// ============================================
// BUILD SORT
// ============================================

interface SortItem {
  field: string;
  order: 'asc' | 'desc';
}

export function buildSort(
  sort: SortItem[] | undefined,
  fieldMap: FieldMap,
  defaultSort?: { column: PgColumn; order: 'asc' | 'desc' }
): SQL[] {
  const clauses: SQL[] = [];

  if (sort?.length) {
    for (const item of sort) {
      const col = fieldMap[item.field];
      if (col) {
        clauses.push(item.order === 'asc' ? asc(col) : desc(col));
      }
    }
  }

  if (!clauses.length && defaultSort) {
    clauses.push(defaultSort.order === 'asc' ? asc(defaultSort.column) : desc(defaultSort.column));
  }

  return clauses;
}

// ============================================
// PAGINATION
// ============================================

export function buildPagination(page: number, limit: number) {
  return {
    limit,
    offset: (page - 1) * limit,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ============================================
// BUILD QUERY (combine all)
// ============================================

export interface BuildQueryParams {
  where?: WhereInput;
  search?: string;
  sort?: SortItem[];
  page: number;
  limit: number;
}

export interface BuildQueryResult {
  whereClause: SQL | undefined;
  orderBy: SQL[];
  limit: number;
  offset: number;
}

export function buildQuery(params: BuildQueryParams, config: QueryConfig): BuildQueryResult {
  const { where, search, sort, page, limit } = params;
  const { fields, searchFields = [], defaultSort } = config;

  const whereFromFilters = buildWhere(where, fields);
  const whereFromSearch = buildSearch(search, searchFields);

  let whereClause: SQL | undefined;
  if (whereFromFilters && whereFromSearch) {
    whereClause = and(whereFromFilters, whereFromSearch);
  } else {
    whereClause = whereFromFilters ?? whereFromSearch;
  }

  const orderBy = buildSort(sort, fields, defaultSort);
  const { limit: queryLimit, offset } = buildPagination(page, limit);

  return { whereClause, orderBy, limit: queryLimit, offset };
}
