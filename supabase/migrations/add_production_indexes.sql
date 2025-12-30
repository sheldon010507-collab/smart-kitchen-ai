-- ============================================
-- Production Indexes for SmartKitchen AI
-- Run this in Supabase SQL Editor before launch
-- ============================================

-- 1. Inventory items - high frequency queries
CREATE INDEX IF NOT EXISTS idx_inventory_business_id 
ON inventory_items(business_id);

CREATE INDEX IF NOT EXISTS idx_inventory_business_name 
ON inventory_items(business_id, name);

CREATE INDEX IF NOT EXISTS idx_inventory_business_updated 
ON inventory_items(business_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_expiry 
ON inventory_items(business_id, expiry_date) 
WHERE expiry_date IS NOT NULL;

-- 2. SKU Master - for AI recognition matching
CREATE INDEX IF NOT EXISTS idx_sku_master_business 
ON sku_master(business_id);

CREATE INDEX IF NOT EXISTS idx_sku_master_name 
ON sku_master(business_id, name);

-- 3. Business members - for role lookups
CREATE INDEX IF NOT EXISTS idx_business_members_user 
ON business_members(user_id);

CREATE INDEX IF NOT EXISTS idx_business_members_business 
ON business_members(business_id);

CREATE INDEX IF NOT EXISTS idx_business_members_status 
ON business_members(business_id, status);

-- 4. OTP codes - for login verification
CREATE INDEX IF NOT EXISTS idx_otp_codes_email 
ON otp_codes(email, expires_at DESC);

-- ============================================
-- Verify indexes were created
-- ============================================
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
