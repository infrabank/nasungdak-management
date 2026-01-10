-- Create oil_change_history table
CREATE TABLE IF NOT EXISTS "oil_change_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_date" date NOT NULL,
	"fryer_type" varchar(20) NOT NULL,
	"oil_type" varchar(50) DEFAULT '해바라기씨유' NOT NULL,
	"quantity" decimal(10,2) NOT NULL,
	"supplier_name" varchar(200) NOT NULL,
	"unit_price" decimal(12,2) NOT NULL,
	"total_cost" decimal(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
	"previous_oil_usage" decimal(10,2),
	"usage_days" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(100),
	"updated_by" varchar(100),
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar(100)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "oil_change_history_change_date_idx" ON "oil_change_history" ("change_date");
CREATE INDEX IF NOT EXISTS "oil_change_history_fryer_type_idx" ON "oil_change_history" ("fryer_type");
CREATE INDEX IF NOT EXISTS "oil_change_history_deleted_at_idx" ON "oil_change_history" ("deleted_at");