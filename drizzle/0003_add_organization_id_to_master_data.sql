-- Migration: Add organization_id to master data tables for multi-tenancy
-- This migration adds organization_id column to:
-- - suppliers
-- - menu_categories  
-- - ingredients
-- - skus
-- - menu_ingredients
-- - cost_distribution_rules

-- Add organization_id to suppliers
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" 
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS "suppliers_org_id_idx" ON "suppliers" ("organization_id");

-- Add organization_id to menu_categories
ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_organization_id_organizations_id_fk" 
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS "menu_categories_org_id_idx" ON "menu_categories" ("organization_id");

-- Add organization_id to ingredients
ALTER TABLE "ingredients" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_organization_id_organizations_id_fk" 
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS "ingredients_org_id_idx" ON "ingredients" ("organization_id");

-- Add organization_id to skus
ALTER TABLE "skus" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "skus" ADD CONSTRAINT "skus_organization_id_organizations_id_fk" 
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS "skus_org_id_idx" ON "skus" ("organization_id");

-- Add organization_id to menu_ingredients
ALTER TABLE "menu_ingredients" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "menu_ingredients" ADD CONSTRAINT "menu_ingredients_organization_id_organizations_id_fk" 
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS "mi_org_id_idx" ON "menu_ingredients" ("organization_id");

-- Add organization_id to cost_distribution_rules
ALTER TABLE "cost_distribution_rules" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "cost_distribution_rules" ADD CONSTRAINT "cost_distribution_rules_organization_id_organizations_id_fk" 
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS "cdr_org_id_idx" ON "cost_distribution_rules" ("organization_id");

-- Data migration: Set organization_id for existing records based on the default organization
-- This will set all existing master data to the first organization found (typically 'nasungdak-default')
UPDATE "suppliers" 
SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'nasungdak-default' LIMIT 1)
WHERE "organization_id" IS NULL;

UPDATE "menu_categories" 
SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'nasungdak-default' LIMIT 1)
WHERE "organization_id" IS NULL;

UPDATE "ingredients" 
SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'nasungdak-default' LIMIT 1)
WHERE "organization_id" IS NULL;

UPDATE "skus" 
SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'nasungdak-default' LIMIT 1)
WHERE "organization_id" IS NULL;

UPDATE "menu_ingredients" 
SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'nasungdak-default' LIMIT 1)
WHERE "organization_id" IS NULL;

UPDATE "cost_distribution_rules" 
SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'nasungdak-default' LIMIT 1)
WHERE "organization_id" IS NULL;
