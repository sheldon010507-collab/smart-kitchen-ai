-- ============================================================
-- SHOPPING LIST MODULE - DATABASE MIGRATION
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- ===================
-- 1. CREATE TABLE
-- ===================
CREATE TABLE IF NOT EXISTS shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Location reference (business_id based on existing schema)
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Optional link to inventory item (NULL for manual entries)
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  
  -- Item details
  item_name TEXT NOT NULL,
  category TEXT,
  quantity_needed NUMERIC NOT NULL CHECK (quantity_needed > 0),
  unit TEXT NOT NULL,
  estimated_cost NUMERIC,
  
  -- Classification
  reason TEXT NOT NULL CHECK (reason IN ('low_stock', 'expiring', 'prep_required', 'manual')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'purchased', 'cancelled')),
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  purchased_at TIMESTAMPTZ,
  notes TEXT,
  
  -- Prevent duplicate pending items for same inventory item at same business
  CONSTRAINT unique_pending_inventory_item 
    UNIQUE NULLS NOT DISTINCT (business_id, inventory_item_id, status)
);

-- ===================
-- 2. CREATE INDEXES
-- ===================
CREATE INDEX IF NOT EXISTS idx_shopping_list_business ON shopping_list(business_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_status ON shopping_list(status);
CREATE INDEX IF NOT EXISTS idx_shopping_list_business_status ON shopping_list(business_id, status);
CREATE INDEX IF NOT EXISTS idx_shopping_list_priority ON shopping_list(priority) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_shopping_list_created_at ON shopping_list(created_at DESC);

-- ===================
-- 3. AUTO-UPDATE TRIGGER
-- ===================
CREATE OR REPLACE FUNCTION update_shopping_list_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'purchased' AND (OLD.status IS NULL OR OLD.status != 'purchased') THEN
    NEW.purchased_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shopping_list_updated ON shopping_list;
CREATE TRIGGER shopping_list_updated
  BEFORE UPDATE ON shopping_list
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_list_timestamp();

-- ===================
-- 4. RLS POLICIES
-- ===================
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shopping list for businesses they belong to
DROP POLICY IF EXISTS "Users can view own business shopping list" ON shopping_list;
CREATE POLICY "Users can view own business shopping list"
  ON shopping_list FOR SELECT
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

-- Policy: Users can insert to businesses they belong to
DROP POLICY IF EXISTS "Users can insert to own business" ON shopping_list;
CREATE POLICY "Users can insert to own business"
  ON shopping_list FOR INSERT
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

-- Policy: Users can update items in their businesses
DROP POLICY IF EXISTS "Users can update own business items" ON shopping_list;
CREATE POLICY "Users can update own business items"
  ON shopping_list FOR UPDATE
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

-- Policy: Users can delete items in their businesses
DROP POLICY IF EXISTS "Users can delete own business items" ON shopping_list;
CREATE POLICY "Users can delete own business items"
  ON shopping_list FOR DELETE
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

-- ===================
-- 5. AGGREGATION RPC (for Manager Master View)
-- ===================
CREATE OR REPLACE FUNCTION get_shopping_list_summary(p_owner_id UUID)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  pending_count BIGINT,
  urgent_count BIGINT,
  total_items BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as business_id,
    b.name as business_name,
    COUNT(*) FILTER (WHERE sl.status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE sl.status = 'pending' AND sl.priority = 'urgent') as urgent_count,
    COUNT(*) as total_items
  FROM businesses b
  LEFT JOIN shopping_list sl ON sl.business_id = b.id
  WHERE b.owner_id = p_owner_id
  GROUP BY b.id, b.name
  ORDER BY urgent_count DESC, pending_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- 6. COMMENTS
-- ===================
COMMENT ON TABLE shopping_list IS 'Shopping/procurement list items for each business location';
COMMENT ON COLUMN shopping_list.reason IS 'Why this item was added: low_stock, expiring, prep_required, or manual';
COMMENT ON COLUMN shopping_list.priority IS 'Urgency level: urgent, normal, or low';
COMMENT ON COLUMN shopping_list.status IS 'Current state: pending, purchased, or cancelled';
