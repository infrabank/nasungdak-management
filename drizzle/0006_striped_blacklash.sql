CREATE TABLE IF NOT EXISTS "daily_closings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"closing_date" date NOT NULL,
	"card_sales" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cash_sales" numeric(14, 2) DEFAULT '0' NOT NULL,
	"delivery_sales" numeric(14, 2) DEFAULT '0' NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(100),
	"updated_by" varchar(100),
	"deleted_at" timestamp,
	"deleted_by" varchar(100),
	CONSTRAINT "dc_store_date_unique" UNIQUE("store_id","closing_date")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dc_store_id_idx" ON "daily_closings" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dc_closing_date_idx" ON "daily_closings" USING btree ("closing_date" DESC NULLS LAST);