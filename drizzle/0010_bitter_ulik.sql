ALTER TABLE "daily_closings" ADD COLUMN "transfer_sales" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD COLUMN "simple_pay_sales" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD COLUMN "card_fee_rate" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD COLUMN "simple_pay_fee_rate" numeric(5, 2) DEFAULT '0' NOT NULL;