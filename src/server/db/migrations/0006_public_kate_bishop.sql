ALTER TABLE "affiliation_offices" ALTER COLUMN "representative_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "affiliation_offices" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "user_affiliation_offices" ADD COLUMN "user_name" varchar(255) NOT NULL;