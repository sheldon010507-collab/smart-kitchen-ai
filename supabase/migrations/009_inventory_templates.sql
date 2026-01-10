-- ============================================================
-- INVENTORY TEMPLATES TABLE MIGRATION
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- ===================
-- 1. CREATE TABLE
-- ===================

CREATE TABLE IF NOT EXISTS inventory_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(100) NOT NULL,
  name_zh VARCHAR(100),
  description TEXT,
  icon VARCHAR(10) DEFAULT '📦',
  industry VARCHAR(50),
  
  -- Template Data (JSONB)
  categories JSONB NOT NULL DEFAULT '[]',
  locations JSONB NOT NULL DEFAULT '[]',
  items JSONB NOT NULL DEFAULT '[]',
  
  -- Metadata
  is_system BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: User templates must have owner_id
  CONSTRAINT valid_ownership CHECK (
    is_system = TRUE OR owner_id IS NOT NULL
  )
);

COMMENT ON TABLE inventory_templates IS 'Inventory templates for quick setup';
COMMENT ON COLUMN inventory_templates.is_system IS 'System preset templates cannot be edited/deleted';

-- ===================
-- 2. CREATE INDEXES
-- ===================

CREATE INDEX IF NOT EXISTS idx_templates_owner ON inventory_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_templates_business ON inventory_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_templates_system ON inventory_templates(is_system) WHERE is_system = TRUE;
CREATE INDEX IF NOT EXISTS idx_templates_industry ON inventory_templates(industry);

-- ===================
-- 3. AUTO-UPDATE TRIGGER
-- ===================

CREATE OR REPLACE FUNCTION update_inventory_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_template_updated ON inventory_templates;
CREATE TRIGGER inventory_template_updated
  BEFORE UPDATE ON inventory_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_template_timestamp();

-- ===================
-- 4. RLS POLICIES
-- ===================

ALTER TABLE inventory_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: Can view own templates + system templates
DROP POLICY IF EXISTS "templates_select_policy" ON inventory_templates;
CREATE POLICY "templates_select_policy"
  ON inventory_templates FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR is_system = TRUE
  );

-- INSERT: Can only create own templates (not system)
DROP POLICY IF EXISTS "templates_insert_policy" ON inventory_templates;
CREATE POLICY "templates_insert_policy"
  ON inventory_templates FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() 
    AND is_system = FALSE
    AND (
      business_id IS NULL 
      OR has_business_access(business_id)
    )
  );

-- UPDATE: Can only update own non-system templates
DROP POLICY IF EXISTS "templates_update_policy" ON inventory_templates;
CREATE POLICY "templates_update_policy"
  ON inventory_templates FOR UPDATE
  USING (
    owner_id = auth.uid() 
    AND is_system = FALSE
  )
  WITH CHECK (
    owner_id = auth.uid() 
    AND is_system = FALSE
  );

-- DELETE: Can only delete own non-system templates
DROP POLICY IF EXISTS "templates_delete_policy" ON inventory_templates;
CREATE POLICY "templates_delete_policy"
  ON inventory_templates FOR DELETE
  USING (
    owner_id = auth.uid() 
    AND is_system = FALSE
  );

-- ===================
-- 5. RPC FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE inventory_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_template_usage(UUID) IS 'Atomically increment template usage count';

-- ===================
-- 6. INSERT SYSTEM TEMPLATES
-- ===================

-- Chinese Restaurant
INSERT INTO inventory_templates (
  id, name, name_zh, description, icon, industry,
  categories, locations, items,
  is_system, usage_count
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Chinese Restaurant',
  '中餐館',
  'Full ingredient kit for Chinese cuisine',
  '🍜',
  'Restaurant',
  '[{"name":"Meat"},{"name":"Poultry"},{"name":"Seafood"},{"name":"Vegetables"},{"name":"Tofu & Soy"},{"name":"Noodles & Rice"},{"name":"Sauces"},{"name":"Spices"},{"name":"Oils"},{"name":"Dry Goods"},{"name":"Dairy"},{"name":"Beverages"}]'::jsonb,
  '[{"name":"Walk-in Fridge","type":"Fridge"},{"name":"Freezer","type":"Freezer"},{"name":"Dry Storage","type":"Dry"},{"name":"Kitchen Line","type":"Dry"},{"name":"Prep Station","type":"Fridge"}]'::jsonb,
  '[{"name":"Pork Belly","category":"Meat","unit":"kg","suggestedPar":5},{"name":"Pork Mince","category":"Meat","unit":"kg","suggestedPar":3},{"name":"Beef Sirloin","category":"Meat","unit":"kg","suggestedPar":4},{"name":"Chicken Breast","category":"Poultry","unit":"kg","suggestedPar":5},{"name":"Chicken Thigh","category":"Poultry","unit":"kg","suggestedPar":4},{"name":"Duck","category":"Poultry","unit":"pcs","suggestedPar":3},{"name":"Prawns","category":"Seafood","unit":"kg","suggestedPar":2},{"name":"Squid","category":"Seafood","unit":"kg","suggestedPar":2},{"name":"Fish Fillet","category":"Seafood","unit":"kg","suggestedPar":3},{"name":"Bok Choy","category":"Vegetables","unit":"kg","suggestedPar":4},{"name":"Chinese Cabbage","category":"Vegetables","unit":"kg","suggestedPar":5},{"name":"Spring Onion","category":"Vegetables","unit":"bunch","suggestedPar":10},{"name":"Ginger","category":"Vegetables","unit":"kg","suggestedPar":1},{"name":"Garlic","category":"Vegetables","unit":"kg","suggestedPar":1},{"name":"Chilli Peppers","category":"Vegetables","unit":"kg","suggestedPar":0.5},{"name":"Bean Sprouts","category":"Vegetables","unit":"kg","suggestedPar":2},{"name":"Mushrooms (Shiitake)","category":"Vegetables","unit":"kg","suggestedPar":1},{"name":"Carrots","category":"Vegetables","unit":"kg","suggestedPar":3},{"name":"Broccoli","category":"Vegetables","unit":"kg","suggestedPar":2},{"name":"Firm Tofu","category":"Tofu & Soy","unit":"block","suggestedPar":10},{"name":"Silken Tofu","category":"Tofu & Soy","unit":"block","suggestedPar":5},{"name":"Jasmine Rice","category":"Noodles & Rice","unit":"kg","suggestedPar":20},{"name":"Egg Noodles","category":"Noodles & Rice","unit":"kg","suggestedPar":5},{"name":"Rice Noodles","category":"Noodles & Rice","unit":"kg","suggestedPar":3},{"name":"Soy Sauce (Light)","category":"Sauces","unit":"L","suggestedPar":5},{"name":"Soy Sauce (Dark)","category":"Sauces","unit":"L","suggestedPar":2},{"name":"Oyster Sauce","category":"Sauces","unit":"L","suggestedPar":3},{"name":"Hoisin Sauce","category":"Sauces","unit":"L","suggestedPar":2},{"name":"Sesame Oil","category":"Oils","unit":"L","suggestedPar":2},{"name":"Vegetable Oil","category":"Oils","unit":"L","suggestedPar":10},{"name":"Shaoxing Wine","category":"Sauces","unit":"L","suggestedPar":2},{"name":"Rice Vinegar","category":"Sauces","unit":"L","suggestedPar":1},{"name":"Chilli Bean Paste","category":"Sauces","unit":"kg","suggestedPar":1},{"name":"Five Spice Powder","category":"Spices","unit":"kg","suggestedPar":0.5},{"name":"White Pepper","category":"Spices","unit":"kg","suggestedPar":0.3},{"name":"Sichuan Peppercorns","category":"Spices","unit":"kg","suggestedPar":0.2},{"name":"Star Anise","category":"Spices","unit":"kg","suggestedPar":0.1},{"name":"Cornstarch","category":"Dry Goods","unit":"kg","suggestedPar":2},{"name":"Plain Flour","category":"Dry Goods","unit":"kg","suggestedPar":5},{"name":"Sugar","category":"Dry Goods","unit":"kg","suggestedPar":2},{"name":"Salt","category":"Dry Goods","unit":"kg","suggestedPar":2},{"name":"Eggs","category":"Dairy","unit":"pcs","suggestedPar":60},{"name":"Spring Roll Wrappers","category":"Dry Goods","unit":"pack","suggestedPar":5},{"name":"Wonton Wrappers","category":"Dry Goods","unit":"pack","suggestedPar":5},{"name":"Dried Shrimp","category":"Dry Goods","unit":"kg","suggestedPar":0.5},{"name":"Chinese Sausage","category":"Meat","unit":"pack","suggestedPar":3},{"name":"Char Siu Sauce","category":"Sauces","unit":"L","suggestedPar":1}]'::jsonb,
  TRUE,
  0
) ON CONFLICT (id) DO NOTHING;

-- Cafe / Tea House
INSERT INTO inventory_templates (
  id, name, name_zh, description, icon, industry,
  categories, locations, items,
  is_system, usage_count
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'Cafe / Tea House',
  '咖啡館/茶飲店',
  'Essentials for coffee shops and tea houses',
  '☕',
  'Cafe',
  '[{"name":"Coffee"},{"name":"Tea"},{"name":"Dairy"},{"name":"Syrups"},{"name":"Pastries"},{"name":"Dry Goods"},{"name":"Packaging"}]'::jsonb,
  '[{"name":"Bar Counter","type":"Dry"},{"name":"Under Counter Fridge","type":"Fridge"},{"name":"Back Storage","type":"Dry"},{"name":"Display Case","type":"Fridge"}]'::jsonb,
  '[{"name":"Espresso Blend Beans","category":"Coffee","unit":"kg","suggestedPar":5},{"name":"Single Origin Beans","category":"Coffee","unit":"kg","suggestedPar":2},{"name":"Decaf Beans","category":"Coffee","unit":"kg","suggestedPar":1},{"name":"English Breakfast Tea","category":"Tea","unit":"box","suggestedPar":3},{"name":"Earl Grey Tea","category":"Tea","unit":"box","suggestedPar":2},{"name":"Green Tea","category":"Tea","unit":"box","suggestedPar":2},{"name":"Chamomile Tea","category":"Tea","unit":"box","suggestedPar":2},{"name":"Whole Milk","category":"Dairy","unit":"L","suggestedPar":20},{"name":"Oat Milk","category":"Dairy","unit":"L","suggestedPar":10},{"name":"Almond Milk","category":"Dairy","unit":"L","suggestedPar":5},{"name":"Soy Milk","category":"Dairy","unit":"L","suggestedPar":5},{"name":"Vanilla Syrup","category":"Syrups","unit":"L","suggestedPar":2},{"name":"Caramel Syrup","category":"Syrups","unit":"L","suggestedPar":2},{"name":"Hazelnut Syrup","category":"Syrups","unit":"L","suggestedPar":1},{"name":"Chocolate Sauce","category":"Syrups","unit":"L","suggestedPar":2},{"name":"White Sugar","category":"Dry Goods","unit":"kg","suggestedPar":3},{"name":"Brown Sugar","category":"Dry Goods","unit":"kg","suggestedPar":1},{"name":"Honey","category":"Dry Goods","unit":"kg","suggestedPar":1},{"name":"Takeaway Cups (12oz)","category":"Packaging","unit":"sleeve","suggestedPar":10},{"name":"Takeaway Cups (16oz)","category":"Packaging","unit":"sleeve","suggestedPar":10},{"name":"Cup Lids","category":"Packaging","unit":"sleeve","suggestedPar":10},{"name":"Napkins","category":"Packaging","unit":"pack","suggestedPar":5}]'::jsonb,
  TRUE,
  0
) ON CONFLICT (id) DO NOTHING;

-- Bakery
INSERT INTO inventory_templates (
  id, name, name_zh, description, icon, industry,
  categories, locations, items,
  is_system, usage_count
) VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'Bakery',
  '烘焙坊',
  'Baking essentials and pastry ingredients',
  '🥐',
  'Bakery',
  '[{"name":"Flour"},{"name":"Sugar"},{"name":"Fats"},{"name":"Dairy"},{"name":"Eggs"},{"name":"Leavening"},{"name":"Chocolate"},{"name":"Fruits & Nuts"}]'::jsonb,
  '[{"name":"Dry Store","type":"Dry"},{"name":"Cold Room","type":"Fridge"},{"name":"Freezer","type":"Freezer"},{"name":"Baking Station","type":"Dry"},{"name":"Display Counter","type":"Dry"}]'::jsonb,
  '[{"name":"Bread Flour","category":"Flour","unit":"kg","suggestedPar":25},{"name":"Plain Flour","category":"Flour","unit":"kg","suggestedPar":20},{"name":"Cake Flour","category":"Flour","unit":"kg","suggestedPar":10},{"name":"Wholemeal Flour","category":"Flour","unit":"kg","suggestedPar":5},{"name":"Caster Sugar","category":"Sugar","unit":"kg","suggestedPar":10},{"name":"Icing Sugar","category":"Sugar","unit":"kg","suggestedPar":5},{"name":"Brown Sugar","category":"Sugar","unit":"kg","suggestedPar":3},{"name":"Unsalted Butter","category":"Fats","unit":"kg","suggestedPar":10},{"name":"Margarine","category":"Fats","unit":"kg","suggestedPar":5},{"name":"Vegetable Shortening","category":"Fats","unit":"kg","suggestedPar":3},{"name":"Double Cream","category":"Dairy","unit":"L","suggestedPar":5},{"name":"Whole Milk","category":"Dairy","unit":"L","suggestedPar":10},{"name":"Cream Cheese","category":"Dairy","unit":"kg","suggestedPar":3},{"name":"Fresh Eggs","category":"Eggs","unit":"pcs","suggestedPar":120},{"name":"Instant Yeast","category":"Leavening","unit":"kg","suggestedPar":0.5},{"name":"Baking Powder","category":"Leavening","unit":"kg","suggestedPar":1},{"name":"Baking Soda","category":"Leavening","unit":"kg","suggestedPar":0.5},{"name":"Dark Chocolate","category":"Chocolate","unit":"kg","suggestedPar":3},{"name":"Milk Chocolate","category":"Chocolate","unit":"kg","suggestedPar":2},{"name":"Cocoa Powder","category":"Chocolate","unit":"kg","suggestedPar":2},{"name":"Vanilla Extract","category":"Leavening","unit":"L","suggestedPar":0.5},{"name":"Almonds","category":"Fruits & Nuts","unit":"kg","suggestedPar":2},{"name":"Walnuts","category":"Fruits & Nuts","unit":"kg","suggestedPar":1},{"name":"Dried Cranberries","category":"Fruits & Nuts","unit":"kg","suggestedPar":1}]'::jsonb,
  TRUE,
  0
) ON CONFLICT (id) DO NOTHING;

-- Convenience Store
INSERT INTO inventory_templates (
  id, name, name_zh, description, icon, industry,
  categories, locations, items,
  is_system, usage_count
) VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'Convenience Store',
  '便利店',
  'Quick-service retail essentials',
  '🏪',
  'Retail',
  '[{"name":"Beverages"},{"name":"Snacks"},{"name":"Ready Meals"},{"name":"Dairy"},{"name":"Sundries"}]'::jsonb,
  '[{"name":"Drink Fridge","type":"Fridge"},{"name":"Food Fridge","type":"Fridge"},{"name":"Snack Shelves","type":"Dry"},{"name":"Counter Display","type":"Dry"},{"name":"Back Stock","type":"Dry"}]'::jsonb,
  '[{"name":"Coca-Cola (330ml)","category":"Beverages","unit":"case","suggestedPar":5},{"name":"Water Bottles (500ml)","category":"Beverages","unit":"case","suggestedPar":10},{"name":"Energy Drinks","category":"Beverages","unit":"case","suggestedPar":3},{"name":"Fresh Juice","category":"Beverages","unit":"pcs","suggestedPar":20},{"name":"Crisps (Mixed)","category":"Snacks","unit":"box","suggestedPar":5},{"name":"Chocolate Bars","category":"Snacks","unit":"box","suggestedPar":3},{"name":"Sandwiches","category":"Ready Meals","unit":"pcs","suggestedPar":20},{"name":"Salads","category":"Ready Meals","unit":"pcs","suggestedPar":10},{"name":"Sushi Packs","category":"Ready Meals","unit":"pcs","suggestedPar":10},{"name":"Fresh Milk","category":"Dairy","unit":"L","suggestedPar":10},{"name":"Yogurt","category":"Dairy","unit":"pcs","suggestedPar":20}]'::jsonb,
  TRUE,
  0
) ON CONFLICT (id) DO NOTHING;

-- Hotpot Restaurant
INSERT INTO inventory_templates (
  id, name, name_zh, description, icon, industry,
  categories, locations, items,
  is_system, usage_count
) VALUES (
  'a0000000-0000-0000-0000-000000000005',
  'Hotpot Restaurant',
  '火鍋店',
  'Hotpot dining essentials',
  '🍲',
  'Restaurant',
  '[{"name":"Meat Slices"},{"name":"Seafood"},{"name":"Meatballs"},{"name":"Vegetables"},{"name":"Tofu"},{"name":"Noodles"},{"name":"Soup Base"},{"name":"Dipping Sauce"}]'::jsonb,
  '[{"name":"Main Freezer","type":"Freezer"},{"name":"Prep Fridge","type":"Fridge"},{"name":"Sauce Station","type":"Dry"},{"name":"Display Counter","type":"Fridge"}]'::jsonb,
  '[{"name":"Beef Slices (Fatty)","category":"Meat Slices","unit":"kg","suggestedPar":10},{"name":"Beef Slices (Lean)","category":"Meat Slices","unit":"kg","suggestedPar":8},{"name":"Lamb Slices","category":"Meat Slices","unit":"kg","suggestedPar":8},{"name":"Pork Slices","category":"Meat Slices","unit":"kg","suggestedPar":5},{"name":"Prawns","category":"Seafood","unit":"kg","suggestedPar":3},{"name":"Fish Fillets","category":"Seafood","unit":"kg","suggestedPar":3},{"name":"Squid","category":"Seafood","unit":"kg","suggestedPar":2},{"name":"Beef Balls","category":"Meatballs","unit":"kg","suggestedPar":5},{"name":"Fish Balls","category":"Meatballs","unit":"kg","suggestedPar":5},{"name":"Pork Balls","category":"Meatballs","unit":"kg","suggestedPar":3},{"name":"Crab Sticks","category":"Meatballs","unit":"kg","suggestedPar":3},{"name":"Napa Cabbage","category":"Vegetables","unit":"kg","suggestedPar":10},{"name":"Spinach","category":"Vegetables","unit":"kg","suggestedPar":5},{"name":"Enoki Mushrooms","category":"Vegetables","unit":"kg","suggestedPar":4},{"name":"Wood Ear Mushrooms","category":"Vegetables","unit":"kg","suggestedPar":2},{"name":"Lotus Root","category":"Vegetables","unit":"kg","suggestedPar":3},{"name":"Firm Tofu","category":"Tofu","unit":"block","suggestedPar":20},{"name":"Tofu Skin","category":"Tofu","unit":"pack","suggestedPar":10},{"name":"Glass Noodles","category":"Noodles","unit":"kg","suggestedPar":3},{"name":"Udon Noodles","category":"Noodles","unit":"kg","suggestedPar":5},{"name":"Sichuan Spicy Base","category":"Soup Base","unit":"pack","suggestedPar":20},{"name":"Tomato Base","category":"Soup Base","unit":"pack","suggestedPar":15},{"name":"Mushroom Base","category":"Soup Base","unit":"pack","suggestedPar":10},{"name":"Sesame Paste","category":"Dipping Sauce","unit":"kg","suggestedPar":3},{"name":"Chilli Oil","category":"Dipping Sauce","unit":"L","suggestedPar":2},{"name":"Garlic Paste","category":"Dipping Sauce","unit":"kg","suggestedPar":1}]'::jsonb,
  TRUE,
  0
) ON CONFLICT (id) DO NOTHING;

-- ===================
-- 7. VERIFICATION
-- ===================
-- Run this to verify:
-- SELECT id, name, icon, is_system, array_length((items)::jsonb, 1) as item_count FROM inventory_templates;
