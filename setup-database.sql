-- Create all tables for 나성닭강정 매입·판매·원가 관리 시스템

-- 1. Menu Categories Table
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(100)
);

-- 2. Ingredients Table
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name VARCHAR(100) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(100)
);

-- 3. SKUs (Stock Keeping Units) Table
CREATE TABLE IF NOT EXISTS skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_name VARCHAR(100) NOT NULL,
  menu_id UUID NOT NULL REFERENCES menu_categories(id),
  unit_price DECIMAL(10, 2) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(100)
);

-- 4. Menu-Ingredient Junction Table
CREATE TABLE IF NOT EXISTS menu_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menu_categories(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  required_quantity DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(100)
);

-- 5. Purchase Transactions Table
CREATE TABLE IF NOT EXISTS purchase_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  menu_id UUID NOT NULL REFERENCES menu_categories(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  supplier_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(14, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(100)
);

-- 6. Sales Records Table
CREATE TABLE IF NOT EXISTS sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL,
  sku_id UUID NOT NULL REFERENCES skus(id),
  quantity_sold DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_revenue DECIMAL(14, 2) GENERATED ALWAYS AS (quantity_sold * unit_price) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(100)
);

-- 7. Cost Distribution Rules Table
CREATE TABLE IF NOT EXISTS cost_distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menu_categories(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  distribution_percent DECIMAL(5, 2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(100)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_categories_deleted_at ON menu_categories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_ingredients_deleted_at ON ingredients(deleted_at);
CREATE INDEX IF NOT EXISTS idx_skus_deleted_at ON skus(deleted_at);
CREATE INDEX IF NOT EXISTS idx_skus_menu_id ON skus(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_ingredients_menu_id ON menu_ingredients(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_ingredients_ingredient_id ON menu_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_purchase_transactions_date ON purchase_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sales_records_date ON sales_records(sale_date);
