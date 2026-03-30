ALTER TABLE "purchase_transactions" ALTER COLUMN "menu_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_transactions" ADD COLUMN "category" varchar(100);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pt_ingredient_date_idx" ON "purchase_transactions" USING btree ("ingredient_id","transaction_date" DESC NULLS LAST);