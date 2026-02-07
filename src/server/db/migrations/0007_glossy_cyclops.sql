CREATE TYPE "public"."category_code" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
ALTER TABLE "credit_product_categories" ALTER COLUMN "category_code" SET DATA TYPE "public"."category_code" USING "category_code"::"public"."category_code";--> statement-breakpoint
ALTER TABLE "loan_applications" ALTER COLUMN "category_code" SET DATA TYPE "public"."category_code" USING "category_code"::"public"."category_code";--> statement-breakpoint
ALTER TABLE "portfolio_aging_snapshots" ALTER COLUMN "category_code" SET DATA TYPE "public"."category_code" USING "category_code"::"public"."category_code";--> statement-breakpoint
ALTER TABLE "third_parties" ALTER COLUMN "category_code" SET DATA TYPE "public"."category_code" USING "category_code"::"public"."category_code";--> statement-breakpoint
ALTER TABLE "third_parties" ALTER COLUMN "category_code" SET NOT NULL;