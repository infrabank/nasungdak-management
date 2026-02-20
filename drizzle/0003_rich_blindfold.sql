ALTER TABLE "ingredients" ADD COLUMN "barcode" varchar(50);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingredients_barcode_idx" ON "ingredients" USING btree ("barcode");