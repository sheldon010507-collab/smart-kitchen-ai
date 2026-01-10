-- Inventory Items Schema Update
-- Run this in Supabase SQL Editor to add missing columns

-- Add min_stock_level column (Par Level)
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC;

-- Add supplier column
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Add notes column
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Optional: Create index on supplier for faster grouping
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier ON inventory_items(supplier);
