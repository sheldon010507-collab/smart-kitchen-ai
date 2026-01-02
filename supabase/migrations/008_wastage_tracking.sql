-- ============================================================
-- SmartKitchen - Wastage Tracking Table
-- 浪費記錄表（用於成本追蹤和報表分析）
-- ============================================================

-- 創建表
CREATE TABLE IF NOT EXISTS wastage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- 關聯物品
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  
  -- 浪費詳情
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  
  -- 原因
  reason TEXT NOT NULL CHECK (reason IN ('expired', 'damaged', 'spoiled', 'preparation', 'other')),
  notes TEXT,
  
  -- 補充字段（分析用）
  expiry_date DATE,                      -- 原過期日期
  days_past_expiry INTEGER,              -- 過期幾天被丟棄（負數=提前丟棄）
  category TEXT,                         -- 物品類別（方便報表）
  
  -- 元數據
  recorded_by UUID REFERENCES profiles(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_wastage_business 
  ON wastage_records(business_id);
CREATE INDEX IF NOT EXISTS idx_wastage_recorded_at 
  ON wastage_records(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_wastage_reason 
  ON wastage_records(reason);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE wastage_records ENABLE ROW LEVEL SECURITY;

-- Insert: 用戶只能為自己所屬的商家添加浪費記錄
CREATE POLICY "Users can insert own business wastage"
  ON wastage_records FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
    )
  );

-- Select: 用戶只能查看自己所屬商家的浪費記錄
CREATE POLICY "Users can view own business wastage"
  ON wastage_records FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
    )
  );

-- Update: 用戶可以更新自己創建的記錄（24小時內）
CREATE POLICY "Users can update recent own wastage"
  ON wastage_records FOR UPDATE
  USING (
    recorded_by = auth.uid() 
    AND recorded_at > NOW() - INTERVAL '24 hours'
  );

-- Delete: 只有商家 owner 可以刪除浪費記錄
CREATE POLICY "Owners can delete wastage"
  ON wastage_records FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================
-- 輔助視圖：浪費統計
-- ============================================================

CREATE OR REPLACE VIEW wastage_stats AS
SELECT 
  business_id,
  COUNT(*) as total_records,
  SUM(total_cost) as total_loss,
  reason,
  DATE_TRUNC('month', recorded_at) as month
FROM wastage_records
GROUP BY business_id, reason, DATE_TRUNC('month', recorded_at);

-- 授權視圖訪問
GRANT SELECT ON wastage_stats TO authenticated;

-- Comments
COMMENT ON TABLE wastage_records IS '浪費記錄表，用於追蹤過期/損壞物品的成本損失';
COMMENT ON COLUMN wastage_records.days_past_expiry IS '過期天數：正數=過期後丟棄，負數=提前丟棄，NULL=非過期原因';
