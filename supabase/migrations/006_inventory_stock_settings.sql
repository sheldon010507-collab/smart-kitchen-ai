-- ============================================================
-- SmartKitchen - Inventory Stock Settings
-- 添加最低庫存線字段
-- ============================================================

-- 添加 min_stock_level 字段到 inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC DEFAULT 0;

-- 添加說明
COMMENT ON COLUMN inventory_items.min_stock_level IS 
  '最低庫存線，低於此數值時自動加入購物清單';

-- 為現有記錄設置默認值（基於當前庫存的 20%）
UPDATE inventory_items 
SET min_stock_level = GREATEST(1, FLOOR(quantity_value * 0.2))
WHERE min_stock_level = 0 OR min_stock_level IS NULL;

-- 創建索引優化查詢
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock 
ON inventory_items(business_id, quantity_value, min_stock_level)
WHERE quantity_value < min_stock_level;
