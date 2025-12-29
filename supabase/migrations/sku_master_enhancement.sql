-- ============================================================
-- SKU MASTER ENHANCEMENT - RAG DICTIONARY SUPPORT
-- ============================================================
-- 為 sku_master 表添加增強欄位以支持更精準的 AI 識別
-- ============================================================

-- 1. 添加典型包裝規格欄位
ALTER TABLE sku_master ADD COLUMN IF NOT EXISTS typical_package_size TEXT;
COMMENT ON COLUMN sku_master.typical_package_size IS 'Typical package size, e.g., "5kg袋", "500ml瓶"';

-- 2. 添加視覺描述欄位
ALTER TABLE sku_master ADD COLUMN IF NOT EXISTS visual_description TEXT;
COMMENT ON COLUMN sku_master.visual_description IS 'Visual description for AI matching, e.g., "紅色包裝", "透明瓶"';

-- 3. 添加別名列表欄位
ALTER TABLE sku_master ADD COLUMN IF NOT EXISTS aliases TEXT[];
COMMENT ON COLUMN sku_master.aliases IS 'Alternative names in different languages, e.g., {"rice", "壽司米", "すし米"}';

-- 4. 添加典型庫存量欄位
ALTER TABLE sku_master ADD COLUMN IF NOT EXISTS typical_quantity NUMERIC;
COMMENT ON COLUMN sku_master.typical_quantity IS 'Typical inventory quantity for this store';

-- 5. 添加掃描統計欄位（用於未來學習）
ALTER TABLE sku_master ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0;
COMMENT ON COLUMN sku_master.scan_count IS 'Number of times this item has been scanned';

ALTER TABLE sku_master ADD COLUMN IF NOT EXISTS avg_confidence NUMERIC;
COMMENT ON COLUMN sku_master.avg_confidence IS 'Average AI recognition confidence score';

-- 6. 添加最後掃描日期（用於追蹤）
ALTER TABLE sku_master ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;
COMMENT ON COLUMN sku_master.last_scanned_at IS 'Last time this item was recognized in a scan';

-- ============================================================
-- 示例數據（可選，用於測試）
-- ============================================================
-- INSERT INTO sku_master (business_id, sku_code, name, type, category, unit, typical_package_size, visual_description, aliases)
-- VALUES 
--   ('your-business-id', 'raw_rice_01', '壽司米', 'raw', '主食', 'kg', '5kg袋', '白色編織袋', ARRAY['sushi rice', 'すし米', 'white rice']),
--   ('your-business-id', 'raw_oil_01', '食用油', 'raw', '調料', 'L', '5L桶', '透明塑料桶，黃色液體', ARRAY['cooking oil', '沙拉油']);
