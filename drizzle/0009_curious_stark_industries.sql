ALTER TABLE "cost_distribution_rules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "menu_ingredients" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "cost_distribution_rules" CASCADE;--> statement-breakpoint
DROP TABLE "menu_ingredients" CASCADE;--> statement-breakpoint
ALTER TABLE "purchase_transactions" DROP CONSTRAINT IF EXISTS "purchase_transactions_menu_id_menu_categories_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "pt_menu_id_idx";--> statement-breakpoint
ALTER TABLE "purchase_transactions" DROP COLUMN IF EXISTS "menu_id";--> statement-breakpoint
ALTER TABLE "purchase_transactions" DROP COLUMN IF EXISTS "is_valid";