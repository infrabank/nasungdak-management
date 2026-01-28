-- Create employees table
CREATE TABLE IF NOT EXISTS "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"employee_name" varchar(100) NOT NULL,
	"hourly_rate" decimal(10,2) NOT NULL,
	"phone" varchar(20),
	"hire_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(100),
	"updated_by" varchar(100),
	"deleted_at" timestamp,
	"deleted_by" varchar(100),
	CONSTRAINT "employees_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id")
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"work_hours" decimal(5,2) NOT NULL,
	"hourly_rate" decimal(10,2) NOT NULL,
	"total_pay" decimal(14,2) NOT NULL,
	"fixed_cost_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(100),
	"updated_by" varchar(100),
	"deleted_at" timestamp,
	"deleted_by" varchar(100),
	CONSTRAINT "attendance_records_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id"),
	CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id"),
	CONSTRAINT "attendance_records_fixed_cost_id_fkey" FOREIGN KEY ("fixed_cost_id") REFERENCES "fixed_costs"("id")
);

-- Add indexes for employees table
CREATE INDEX IF NOT EXISTS "emp_deleted_at_idx" ON "employees" ("deleted_at");
CREATE INDEX IF NOT EXISTS "emp_store_id_idx" ON "employees" ("store_id");

-- Add indexes for attendance_records table
CREATE INDEX IF NOT EXISTS "ar_deleted_at_idx" ON "attendance_records" ("deleted_at");
CREATE INDEX IF NOT EXISTS "ar_store_id_idx" ON "attendance_records" ("store_id");
CREATE INDEX IF NOT EXISTS "ar_employee_id_idx" ON "attendance_records" ("employee_id");
CREATE INDEX IF NOT EXISTS "ar_work_date_idx" ON "attendance_records" ("work_date" DESC);
CREATE INDEX IF NOT EXISTS "ar_store_date_idx" ON "attendance_records" ("store_id", "work_date" DESC);
