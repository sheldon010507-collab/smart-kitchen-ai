-- ============================================================
-- DATABASE AUDIT SCRIPT
-- ============================================================
-- Run this in Supabase SQL Editor to check your database health
-- ============================================================

-- =============================================
-- 1. CHECK ALL TABLES EXIST
-- =============================================
SELECT 
  '✅ Table Check' AS category,
  tablename,
  CASE 
    WHEN tablename IS NOT NULL THEN '✅ Exists' 
    ELSE '❌ Missing' 
  END AS status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'businesses',
  'business_members', 
  'inventory_items',
  'shopping_list',
  'sku_master',
  'inventory_state',
  'scan_history',
  'menu_items',
  'menu_ingredients',
  'prep_tasks',
  'shifts',
  'sales_receipts',
  'sales_items',
  'otp_codes'
)
ORDER BY tablename;

-- =============================================
-- 2. CHECK HELPER FUNCTIONS EXIST
-- =============================================
SELECT 
  '🔧 Function Check' AS category,
  proname AS function_name,
  CASE 
    WHEN proname IS NOT NULL THEN '✅ Exists' 
    ELSE '❌ Missing' 
  END AS status
FROM pg_proc 
WHERE proname IN ('has_business_access', 'is_active_member', 'is_business_owner');

-- =============================================
-- 3. CHECK RLS IS ENABLED ON ALL TABLES
-- =============================================
SELECT 
  '🔒 RLS Check' AS category,
  relname AS table_name,
  CASE 
    WHEN relrowsecurity THEN '✅ RLS Enabled' 
    ELSE '⚠️ RLS Disabled' 
  END AS rls_status
FROM pg_class 
WHERE relname IN (
  'businesses',
  'business_members', 
  'inventory_items',
  'shopping_list',
  'sku_master',
  'inventory_state',
  'scan_history',
  'menu_items',
  'menu_ingredients',
  'prep_tasks',
  'shifts',
  'sales_receipts',
  'sales_items'
)
AND relkind = 'r'
ORDER BY relname;

-- =============================================
-- 4. LIST ALL POLICIES BY TABLE
-- =============================================
SELECT 
  '📋 Policy List' AS category,
  tablename,
  policyname,
  cmd AS operation,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅' 
    ELSE '⚠️ Restrictive' 
  END AS type
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================
-- 5. CHECK FOR DUPLICATE POLICIES (POTENTIAL ISSUES)
-- =============================================
SELECT 
  '⚠️ Duplicate Policies' AS category,
  tablename,
  cmd,
  COUNT(*) AS policy_count,
  string_agg(policyname, ', ') AS policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename;

-- =============================================
-- 6. CHECK FOREIGN KEY RELATIONSHIPS
-- =============================================
SELECT 
  '🔗 Foreign Keys' AS category,
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  rc.delete_rule AS on_delete
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- =============================================
-- 7. CHECK INDEXES
-- =============================================
SELECT 
  '📊 Indexes' AS category,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
  'menu_items', 'menu_ingredients', 'prep_tasks', 
  'shifts', 'sales_receipts', 'sales_items',
  'inventory_items', 'shopping_list', 'sku_master'
)
ORDER BY tablename, indexname;

-- =============================================
-- 8. SUMMARY REPORT
-- =============================================
SELECT 
  '📈 Summary' AS category,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') AS total_tables,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS total_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS total_indexes;
