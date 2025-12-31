-- ============================================================
-- FIX: 補跑缺失的表和 Policies
-- ============================================================
-- 執行這個腳本來修復缺失的部分
-- ============================================================

-- =============================================
-- 1. 創建缺失的表
-- =============================================

-- PREP TASKS - 備料任務
CREATE TABLE IF NOT EXISTS prep_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE prep_tasks IS 'Daily preparation tasks for kitchen staff';

-- SALES RECEIPTS - 銷售單據
CREATE TABLE IF NOT EXISTS sales_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  receipt_number TEXT,
  table_number TEXT,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'online', 'mixed')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'cancelled')),
  served_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE sales_receipts IS 'Sales transaction records';

-- SALES ITEMS - 銷售明細
CREATE TABLE IF NOT EXISTS sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES sales_receipts(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  notes TEXT
);

COMMENT ON TABLE sales_items IS 'Line items for each sales receipt';

-- =============================================
-- 2. 索引
-- =============================================
CREATE INDEX IF NOT EXISTS idx_prep_tasks_business_date ON prep_tasks(business_id, task_date);
CREATE INDEX IF NOT EXISTS idx_sales_receipts_business_date ON sales_receipts(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_items_receipt ON sales_items(receipt_id);

-- =============================================
-- 3. 啟用 RLS
-- =============================================
ALTER TABLE prep_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_ingredients ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. 刪除 menu_items 舊的 Policies
-- =============================================
DROP POLICY IF EXISTS "Members can manage menu" ON menu_items;
DROP POLICY IF EXISTS "Members can view menu" ON menu_items;
DROP POLICY IF EXISTS "menu_items_access" ON menu_items;

-- =============================================
-- 5. 創建新的 RLS Policies
-- =============================================

-- Menu Items - 使用新的 helper 函數
CREATE POLICY "menu_items_select" ON menu_items FOR SELECT USING (has_business_access(business_id));
CREATE POLICY "menu_items_insert" ON menu_items FOR INSERT WITH CHECK (has_business_access(business_id));
CREATE POLICY "menu_items_update" ON menu_items FOR UPDATE USING (has_business_access(business_id));
CREATE POLICY "menu_items_delete" ON menu_items FOR DELETE USING (is_business_owner(business_id));

-- Menu Ingredients
CREATE POLICY "menu_ingredients_access" ON menu_ingredients FOR ALL USING (
  EXISTS (SELECT 1 FROM menu_items mi WHERE mi.id = menu_item_id AND has_business_access(mi.business_id))
);

-- Prep Tasks
CREATE POLICY "prep_tasks_select" ON prep_tasks FOR SELECT USING (has_business_access(business_id));
CREATE POLICY "prep_tasks_insert" ON prep_tasks FOR INSERT WITH CHECK (has_business_access(business_id));
CREATE POLICY "prep_tasks_update" ON prep_tasks FOR UPDATE USING (has_business_access(business_id));
CREATE POLICY "prep_tasks_delete" ON prep_tasks FOR DELETE USING (has_business_access(business_id));

-- Sales Receipts
CREATE POLICY "sales_receipts_select" ON sales_receipts FOR SELECT USING (has_business_access(business_id));
CREATE POLICY "sales_receipts_insert" ON sales_receipts FOR INSERT WITH CHECK (has_business_access(business_id));
CREATE POLICY "sales_receipts_update" ON sales_receipts FOR UPDATE USING (has_business_access(business_id));
CREATE POLICY "sales_receipts_delete" ON sales_receipts FOR DELETE USING (is_business_owner(business_id));

-- Sales Items
CREATE POLICY "sales_items_access" ON sales_items FOR ALL USING (
  EXISTS (SELECT 1 FROM sales_receipts sr WHERE sr.id = receipt_id AND has_business_access(sr.business_id))
);

-- =============================================
-- 6. 驗證
-- =============================================
-- 執行後運行這個查詢確認：
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('prep_tasks', 'sales_receipts', 'sales_items');
-- SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('menu_items', 'menu_ingredients', 'prep_tasks', 'sales_receipts', 'sales_items') ORDER BY tablename;
