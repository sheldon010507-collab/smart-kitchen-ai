-- Container-Inventory Linking Migration
-- Links inventory items to registered containers for unit consistency

-- 1. Add container_id column to inventory_items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'container_id'
    ) THEN
        ALTER TABLE inventory_items 
        ADD COLUMN container_id UUID REFERENCES containers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Index for faster container lookups
CREATE INDEX IF NOT EXISTS idx_inventory_container 
ON inventory_items(container_id) 
WHERE container_id IS NOT NULL;

-- 3. View to get inventory with container details
CREATE OR REPLACE VIEW inventory_with_containers AS
SELECT 
    i.*,
    c.name AS container_name,
    c.capacity_value AS container_capacity,
    c.capacity_unit AS container_unit
FROM inventory_items i
LEFT JOIN containers c ON i.container_id = c.id;
