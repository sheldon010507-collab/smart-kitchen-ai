-- ============================================================
-- P0 FIX: 刪除重複的 RLS Policies
-- ============================================================
-- 必須立即執行 - 解決嚴重問題
-- ============================================================

-- =============================================
-- 1. business_members - 刪除重複的 INSERT policies
-- =============================================
DROP POLICY IF EXISTS "bm_insert_owner_self" ON business_members;
DROP POLICY IF EXISTS "bm_insert_staff_pending" ON business_members;
-- 保留: bm_insert_consolidated

-- =============================================
-- 2. business_members - 刪除重複的 SELECT policy
-- =============================================
DROP POLICY IF EXISTS "bm_select_self_or_owner" ON business_members;
-- 保留: bm_select_consolidated

-- =============================================
-- 3. businesses - 刪除重複的 SELECT policy
-- =============================================
DROP POLICY IF EXISTS "biz_select_owner_or_member" ON businesses;
-- 保留: biz_select_owner, biz_select_member

-- =============================================
-- 4. menu_items - 刪除舊風格的 policies
-- =============================================
DROP POLICY IF EXISTS "Members can view menu" ON menu_items;
DROP POLICY IF EXISTS "Members can manage menu" ON menu_items;
-- 使用新的: menu_items_select, menu_items_insert, etc.

-- =============================================
-- 5. inventory_items - 刪除重複索引
-- =============================================
DROP INDEX IF EXISTS inventory_items_business_id_idx;
-- 保留: idx_inventory_business_id

-- =============================================
-- 驗證
-- =============================================
-- 執行後運行這個確認:
-- SELECT policyname, tablename FROM pg_policies 
-- WHERE tablename IN ('business_members', 'businesses', 'menu_items') 
-- ORDER BY tablename, policyname;
