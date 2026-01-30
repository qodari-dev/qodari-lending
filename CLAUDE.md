# Project: Qodari Lending

## Tech Stack

- Next.js
- TypeScript
- Drizzle ORM + PostgreSQL
- ts-rest for API contracts
- TanStack Query + Table
- shadcn/ui + Tailwind CSS
- Zod for validation
- React Hook Form

## Project Structure

- `/src/app` - Next.js pages and API routes
- `/src/components` - React components
- `/src/server` - Backend logic (handlers, db, utils)
- `/src/hooks` - Custom React hooks
- `/src/schemas` - Zod schemas
- `/src/utils` - Utility functions

## Conventions

- Use TypeScript strict mode
- Derive types from Zod schemas
- Use `satisfies` for type safety
- No `any` types
- Follow ESLint rules

## Database

- PostgreSQL with Drizzle ORM
- Migrations in `/drizzle`
- Schema in `/src/server/db/schema`
