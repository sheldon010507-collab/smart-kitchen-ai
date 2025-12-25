-- ============================================================
-- SHOPPING LIST MODULE - ROLLBACK SCRIPT
-- ============================================================
-- Run this to completely remove the shopping_list feature
-- ============================================================

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view own business shopping list" ON shopping_list;
DROP POLICY IF EXISTS "Users can insert to own business" ON shopping_list;
DROP POLICY IF EXISTS "Users can update own business items" ON shopping_list;
DROP POLICY IF EXISTS "Users can delete own business items" ON shopping_list;

-- Drop trigger and function
DROP TRIGGER IF EXISTS shopping_list_updated ON shopping_list;
DROP FUNCTION IF EXISTS update_shopping_list_timestamp();

-- Drop aggregation function
DROP FUNCTION IF EXISTS get_shopping_list_summary(UUID);

-- Drop table (cascades indexes and constraints)
DROP TABLE IF EXISTS shopping_list;
