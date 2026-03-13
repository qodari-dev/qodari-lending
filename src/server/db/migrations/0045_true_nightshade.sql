ALTER TABLE "loan_status_history" ALTER COLUMN "from_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loan_status_history" ALTER COLUMN "to_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'GENERATED'::text;--> statement-breakpoint
UPDATE "loans" SET "status" = 'ACCOUNTED' WHERE "status" = 'ACTIVE';--> statement-breakpoint
UPDATE "loans" SET "status" = 'VOID' WHERE "status" = 'INACTIVE';--> statement-breakpoint
UPDATE "loans" SET "status" = 'PAID' WHERE "status" = 'FINISHED';--> statement-breakpoint
UPDATE "loan_status_history" SET "from_status" = 'ACCOUNTED' WHERE "from_status" = 'ACTIVE';--> statement-breakpoint
UPDATE "loan_status_history" SET "from_status" = 'VOID' WHERE "from_status" = 'INACTIVE';--> statement-breakpoint
UPDATE "loan_status_history" SET "from_status" = 'PAID' WHERE "from_status" = 'FINISHED';--> statement-breakpoint
UPDATE "loan_status_history" SET "to_status" = 'ACCOUNTED' WHERE "to_status" = 'ACTIVE';--> statement-breakpoint
UPDATE "loan_status_history" SET "to_status" = 'VOID' WHERE "to_status" = 'INACTIVE';--> statement-breakpoint
UPDATE "loan_status_history" SET "to_status" = 'PAID' WHERE "to_status" = 'FINISHED';--> statement-breakpoint
DROP TYPE "public"."loan_status";--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('GENERATED', 'ACCOUNTED', 'VOID', 'RELIQUIDATED', 'PAID');--> statement-breakpoint
ALTER TABLE "loan_status_history" ALTER COLUMN "from_status" SET DATA TYPE "public"."loan_status" USING "from_status"::"public"."loan_status";--> statement-breakpoint
ALTER TABLE "loan_status_history" ALTER COLUMN "to_status" SET DATA TYPE "public"."loan_status" USING "to_status"::"public"."loan_status";--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'GENERATED'::"public"."loan_status";--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "status" SET DATA TYPE "public"."loan_status" USING "status"::"public"."loan_status";--> statement-breakpoint
ALTER TABLE "loans" DROP COLUMN "guarantee_document";
