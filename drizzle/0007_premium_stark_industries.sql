CREATE TABLE IF NOT EXISTS "purchase_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"default_quantity" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(100),
	"updated_by" varchar(100),
	"deleted_at" timestamp,
	"deleted_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"template_name" varchar(100) NOT NULL,
	"supplier_name" varchar(200) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(100),
	"updated_by" varchar(100),
	"deleted_at" timestamp,
	"deleted_by" varchar(100)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_template_items" ADD CONSTRAINT "purchase_template_items_template_id_purchase_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."purchase_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_template_items" ADD CONSTRAINT "purchase_template_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_templates" ADD CONSTRAINT "purchase_templates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ptpli_template_id_idx" ON "purchase_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ptpli_deleted_at_idx" ON "purchase_template_items" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ptpl_store_id_idx" ON "purchase_templates" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ptpl_deleted_at_idx" ON "purchase_templates" USING btree ("deleted_at");