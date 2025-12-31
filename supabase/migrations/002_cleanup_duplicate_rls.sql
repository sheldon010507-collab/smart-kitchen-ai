-- ============================================================
-- STEP 2: CLEANUP DUPLICATE RLS POLICIES
-- ============================================================
-- Run this SECOND in Supabase SQL Editor
-- This removes conflicting and redundant policies
-- ============================================================

-- =============================================
-- A. CLEANUP staff_calendar_notes TABLE
-- =============================================
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON staff_calendar_notes;
DROP POLICY IF EXISTS "Allow insert/update for authenticated users" ON staff_calendar_notes;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON staff_calendar_notes;
DROP POLICY IF EXISTS "Enable read for members" ON staff_calendar_notes;
DROP POLICY IF EXISTS "Enable write for members" ON staff_calendar_notes;
-- Keep: scn_select_member, scn_upsert_member, scn_update_member

-- =============================================
-- B. CLEANUP businesses TABLE
-- =============================================
-- Remove overly permissive policy (security risk)
DROP POLICY IF EXISTS "Allow SELECT by join_code" ON businesses;
-- Remove duplicates
DROP POLICY IF EXISTS "businesses_insert_own" ON businesses;
DROP POLICY IF EXISTS "businesses_select_own" ON businesses;

-- =============================================
-- C. CLEANUP business_members TABLE
-- =============================================
-- Remove overly permissive insert policy
DROP POLICY IF EXISTS "Allow self-insert for authenticated users" ON business_members;
-- Remove redundant select policies
DROP POLICY IF EXISTS "Allow SELECT own memberships" ON business_members;
DROP POLICY IF EXISTS "Allow owner to see all members" ON business_members;
-- Remove duplicate management policy
DROP POLICY IF EXISTS "Allow owner to manage members" ON business_members;

-- =============================================
-- D. CLEANUP inventory_items TABLE
-- =============================================
DROP POLICY IF EXISTS "inventory_select_active_members" ON inventory_items;
DROP POLICY IF EXISTS "inventory_write_owner_manager" ON inventory_items;

-- =============================================
-- E. CREATE CONSOLIDATED POLICIES FOR business_members
-- =============================================
-- Using the new helper functions

-- SELECT: Users can see their own memberships OR all members of businesses they own
DROP POLICY IF EXISTS "bm_select_consolidated" ON business_members;
CREATE POLICY "bm_select_consolidated" ON business_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_business_owner(business_id)
  );

-- INSERT: Only allow joining via the proper join flow (controlled by app)
-- Staff can insert themselves, Owners can add anyone
DROP POLICY IF EXISTS "bm_insert_consolidated" ON business_members;
CREATE POLICY "bm_insert_consolidated" ON business_members
  FOR INSERT
  WITH CHECK (
    -- Self-insert (for join flow) OR owner adding staff
    user_id = auth.uid() OR is_business_owner(business_id)
  );

-- UPDATE: Only business owners can update member status
DROP POLICY IF EXISTS "bm_update_owner" ON business_members;
CREATE POLICY "bm_update_owner" ON business_members
  FOR UPDATE
  USING (is_business_owner(business_id));

-- DELETE: Only business owners can remove members
DROP POLICY IF EXISTS "bm_delete_owner" ON business_members;
CREATE POLICY "bm_delete_owner" ON business_members
  FOR DELETE
  USING (is_business_owner(business_id));

-- =============================================
-- F. FIX businesses TABLE POLICIES
-- =============================================
-- Owners can see their own businesses
DROP POLICY IF EXISTS "biz_select_owner" ON businesses;
CREATE POLICY "biz_select_owner" ON businesses
  FOR SELECT
  USING (owner_id = auth.uid());

-- Members can see businesses they belong to
DROP POLICY IF EXISTS "biz_select_member" ON businesses;
CREATE POLICY "biz_select_member" ON businesses
  FOR SELECT
  USING (is_active_member(id));

-- Secure join_code lookup (only return join_code match, not all fields)
-- This is handled at application level, not via RLS

-- =============================================
-- VERIFICATION
-- =============================================
-- SELECT policyname, tablename FROM pg_policies ORDER BY tablename, policyname;
