ALTER TABLE "ingredients" ADD COLUMN "management_level" varchar(20) DEFAULT 'core' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "purchase_unit" varchar(20);--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "conversion_factor" numeric(12, 4);--> statement-breakpoint
UPDATE "ingredients" SET "management_level" = 'expense' WHERE "is_one_time" = true;