CREATE TABLE IF NOT EXISTS "maintenance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"task_type" varchar(40) NOT NULL,
	"performed_date" date NOT NULL,
	"interval_days" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(100),
	"updated_by" varchar(100),
	"deleted_at" timestamp,
	"deleted_by" varchar(100)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ml_deleted_at_idx" ON "maintenance_logs" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ml_store_id_idx" ON "maintenance_logs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ml_performed_date_idx" ON "maintenance_logs" USING btree ("performed_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ml_task_type_idx" ON "maintenance_logs" USING btree ("task_type");