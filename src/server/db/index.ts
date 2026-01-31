// ---------------------------------------------------------------------
// index.ts - Barrel file para exportar todo el schema de Drizzle
// ---------------------------------------------------------------------
// Este archivo re-exporta todos los elementos del schema para facilitar imports.
// Uso: import { loans, loansRelations, Loans } from "@/server/db";
// ---------------------------------------------------------------------

export * from "./schema";
export * from "./relations";
export * from "./types";
export * from "./connection";
