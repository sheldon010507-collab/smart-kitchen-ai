-- ============================================================
-- INVENTORY SCAN MODULE - DATABASE MIGRATION
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- ===================
-- 1. SKU MASTER TABLE
-- ===================
CREATE TABLE IF NOT EXISTS sku_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- 基礎信息
  sku_code TEXT NOT NULL,           -- 唯一編碼，如 'raw_carrot_01'
  name TEXT NOT NULL,               -- 名稱，如 '生胡萝卜'
  type TEXT NOT NULL CHECK (type IN ('raw', 'prep')),  -- raw=原材料, prep=備制品
  category TEXT,                    -- 分類，如 '蔬菜', '肉類'
  unit TEXT NOT NULL,               -- 單位，如 'kg', 'box', 'piece'
  image_url TEXT,                   -- 參考圖片（用於 AI 識別訓練）
  
  -- 原材料專用字段 (type = 'raw')
  safety_stock NUMERIC DEFAULT 0,   -- 安全庫存水位
  
  -- 備制品專用字段 (type = 'prep')
  par_level NUMERIC DEFAULT 0,      -- 今日開檔定額
  parent_sku_id UUID REFERENCES sku_master(id),  -- 關聯的父級原材料
  usage_per_unit NUMERIC,           -- 製作1單位備制品需消耗多少原料
  
  -- 元數據
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_id, sku_code)
);

-- ===================
-- 2. INVENTORY STATE TABLE
-- ===================
CREATE TABLE IF NOT EXISTS inventory_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sku_id UUID NOT NULL REFERENCES sku_master(id) ON DELETE CASCADE,
  
  -- 庫存數據
  current_qty NUMERIC NOT NULL DEFAULT 0,  -- 當前數量（來自掃描識別）
  last_scanned_at TIMESTAMPTZ,             -- 最後掃描時間
  scanned_by UUID REFERENCES auth.users(id),
  scan_image_url TEXT,                     -- 掃描時的圖片
  confidence_score NUMERIC,                -- AI 識別置信度 (0-1)
  
  -- 元數據
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_id, sku_id)
);

-- ===================
-- 3. SCAN HISTORY TABLE
-- ===================
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('front', 'back', 'storage')),
  -- front = 前廳（備制品區）, back = 後廚（原料區）, storage = 倉庫
  
  image_url TEXT,
  recognized_items JSONB NOT NULL,  -- AI 識別結果
  created_at TIMESTAMPTZ DEFAULT now(),
  scanned_by UUID REFERENCES auth.users(id)
);

-- ===================
-- 4. INDEXES
-- ===================
CREATE INDEX IF NOT EXISTS idx_sku_master_business ON sku_master(business_id);
CREATE INDEX IF NOT EXISTS idx_sku_master_type ON sku_master(type);
CREATE INDEX IF NOT EXISTS idx_sku_master_parent ON sku_master(parent_sku_id);
CREATE INDEX IF NOT EXISTS idx_inventory_state_business ON inventory_state(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_state_sku ON inventory_state(sku_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_business ON scan_history(business_id);

-- ===================
-- 5. AUTO-UPDATE TRIGGERS
-- ===================
CREATE OR REPLACE FUNCTION update_sku_master_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sku_master_updated ON sku_master;
CREATE TRIGGER sku_master_updated
  BEFORE UPDATE ON sku_master
  FOR EACH ROW
  EXECUTE FUNCTION update_sku_master_timestamp();

CREATE OR REPLACE FUNCTION update_inventory_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_state_updated ON inventory_state;
CREATE TRIGGER inventory_state_updated
  BEFORE UPDATE ON inventory_state
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_state_timestamp();

-- ===================
-- 6. RLS POLICIES
-- ===================
ALTER TABLE sku_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- SKU Master Policies
DROP POLICY IF EXISTS "Users can view own business SKUs" ON sku_master;
CREATE POLICY "Users can view own business SKUs"
  ON sku_master FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert to own business SKUs" ON sku_master;
CREATE POLICY "Users can insert to own business SKUs"
  ON sku_master FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own business SKUs" ON sku_master;
CREATE POLICY "Users can update own business SKUs"
  ON sku_master FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own business SKUs" ON sku_master;
CREATE POLICY "Users can delete own business SKUs"
  ON sku_master FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  );

-- Inventory State Policies
DROP POLICY IF EXISTS "Users can view own business inventory state" ON inventory_state;
CREATE POLICY "Users can view own business inventory state"
  ON inventory_state FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert to own business inventory state" ON inventory_state;
CREATE POLICY "Users can insert to own business inventory state"
  ON inventory_state FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own business inventory state" ON inventory_state;
CREATE POLICY "Users can update own business inventory state"
  ON inventory_state FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  );

-- Scan History Policies
DROP POLICY IF EXISTS "Users can view own business scan history" ON scan_history;
CREATE POLICY "Users can view own business scan history"
  ON scan_history FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert to own business scan history" ON scan_history;
CREATE POLICY "Users can insert to own business scan history"
  ON scan_history FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid()
    )
  );

-- ===================
-- 7. COMMENTS
-- ===================
COMMENT ON TABLE sku_master IS 'SKU master data for raw materials and prep items';
COMMENT ON COLUMN sku_master.type IS 'Item type: raw = raw material, prep = prepared item';
COMMENT ON COLUMN sku_master.parent_sku_id IS 'For prep items, references the parent raw material SKU';
COMMENT ON COLUMN sku_master.usage_per_unit IS 'For prep items, how much raw material is needed to make 1 unit';

COMMENT ON TABLE inventory_state IS 'Real-time inventory state updated by scanning';
COMMENT ON COLUMN inventory_state.confidence_score IS 'AI recognition confidence score between 0 and 1';

COMMENT ON TABLE scan_history IS 'History of inventory scans with AI recognition results';
