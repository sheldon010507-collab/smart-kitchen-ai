-- ============================================================
-- SmartKitchen - Scan Corrections Table
-- 掃描修正記錄表（用於收集 YOLO 訓練數據）
-- ============================================================

-- 創建表
CREATE TABLE IF NOT EXISTS scan_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- 圖片（訓練需要原圖）
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  scan_area TEXT,  -- 'fridge' | 'storage' | 'prep' | 'receipt'
  
  -- 結果對比
  original_result JSONB NOT NULL DEFAULT '[]',   -- AI 原始識別結果
  corrected_result JSONB NOT NULL DEFAULT '[]',  -- 用戶修正後結果
  
  -- 修正摘要
  corrections JSONB NOT NULL DEFAULT '[]',
  -- corrections 格式: [{type, itemName, originalValue, newValue}]
  -- type: 'quantity_changed' | 'item_added' | 'item_removed' | 'name_changed'
  
  -- 元數據
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_scan_corrections_business 
  ON scan_corrections(business_id);
CREATE INDEX IF NOT EXISTS idx_scan_corrections_created 
  ON scan_corrections(created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE scan_corrections ENABLE ROW LEVEL SECURITY;

-- Insert: 用戶只能為自己所屬的商家添加修正記錄
CREATE POLICY "Users can insert own business corrections"
  ON scan_corrections FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
    )
  );

-- Select: 用戶只能查看自己所屬商家的修正記錄
CREATE POLICY "Users can view own business corrections"
  ON scan_corrections FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
    )
  );

-- Update: 用戶可以更新自己創建的記錄（24小時內）
CREATE POLICY "Users can update recent own corrections"
  ON scan_corrections FOR UPDATE
  USING (
    created_by = auth.uid() 
    AND created_at > NOW() - INTERVAL '24 hours'
  );

-- Delete: 只有商家 owner 可以刪除修正記錄
CREATE POLICY "Owners can delete corrections"
  ON scan_corrections FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM business_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================
-- 輔助視圖：修正統計
-- ============================================================

CREATE OR REPLACE VIEW scan_correction_stats AS
SELECT 
  business_id,
  COUNT(*) as total_scans,
  COUNT(*) FILTER (WHERE jsonb_array_length(corrections) > 0) as scans_with_corrections,
  SUM(jsonb_array_length(corrections)) as total_corrections,
  MAX(created_at) as last_scan_at
FROM scan_corrections
GROUP BY business_id;

-- 授權視圖訪問
GRANT SELECT ON scan_correction_stats TO authenticated;
