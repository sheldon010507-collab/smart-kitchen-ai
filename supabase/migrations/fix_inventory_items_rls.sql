-- ============================================================
-- FIX: STAFF INVENTORY RLS POLICIES
-- ============================================================
-- This migration adds RLS policies to allow Staff users to 
-- insert/update/delete inventory items for their businesses.
-- 
-- Run this in Supabase SQL Editor
-- ============================================================

-- ===================
-- 1. CHECK IF RLS IS ENABLED
-- ===================
-- First, ensure RLS is enabled on inventory_items
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- ===================
-- 2. DROP EXISTING POLICIES (Clean Slate)
-- ===================
DROP POLICY IF EXISTS "Users can view own business inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Users can insert to own business inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Users can update own business inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Users can delete own business inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Owner can manage inventory" ON inventory_items;
DROP POLICY IF EXISTS "Staff can insert inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Staff can update inventory items" ON inventory_items;

-- ===================
-- 3. SELECT POLICY (View)
-- ===================
CREATE POLICY "Users can view own business inventory items"
  ON inventory_items FOR SELECT
  USING (
    -- Owner can view
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
    OR
    -- Active staff members can view
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ===================
-- 4. INSERT POLICY (Add new items)
-- ===================
CREATE POLICY "Users can insert to own business inventory items"
  ON inventory_items FOR INSERT
  WITH CHECK (
    -- Owner can insert
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
    OR
    -- Active staff members can insert
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ===================
-- 5. UPDATE POLICY (Edit items)
-- ===================
CREATE POLICY "Users can update own business inventory items"
  ON inventory_items FOR UPDATE
  USING (
    -- Owner can update
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
    OR
    -- Active staff members can update
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ===================
-- 6. DELETE POLICY (Remove items)
-- ===================
CREATE POLICY "Users can delete own business inventory items"
  ON inventory_items FOR DELETE
  USING (
    -- Owner can delete
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
    OR
    -- Active staff members can delete
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ===================
-- 7. VERIFY POLICIES CREATED
-- ===================
-- Run this query to verify policies are in place:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'inventory_items';
