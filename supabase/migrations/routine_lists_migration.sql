-- Routine Lists Migration (Simplified RLS)
-- Run this in Supabase SQL Editor

-- Create routine_lists table
CREATE TABLE IF NOT EXISTS routine_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create routine_list_items table
CREATE TABLE IF NOT EXISTS routine_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_list_id UUID NOT NULL REFERENCES routine_lists(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity_needed NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pcs',
    category TEXT,
    supplier TEXT,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE routine_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_list_items ENABLE ROW LEVEL SECURITY;

-- Simple RLS: Users can access routine_lists for businesses they own
CREATE POLICY "Users can view own routine_lists"
    ON routine_lists FOR SELECT
    USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can insert own routine_lists"
    ON routine_lists FOR INSERT
    WITH CHECK (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can update own routine_lists"
    ON routine_lists FOR UPDATE
    USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can delete own routine_lists"
    ON routine_lists FOR DELETE
    USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    );

-- RLS for routine_list_items (based on parent routine_list)
CREATE POLICY "Users can view own routine_list_items"
    ON routine_list_items FOR SELECT
    USING (
        routine_list_id IN (
            SELECT id FROM routine_lists 
            WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert own routine_list_items"
    ON routine_list_items FOR INSERT
    WITH CHECK (
        routine_list_id IN (
            SELECT id FROM routine_lists 
            WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can update own routine_list_items"
    ON routine_list_items FOR UPDATE
    USING (
        routine_list_id IN (
            SELECT id FROM routine_lists 
            WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can delete own routine_list_items"
    ON routine_list_items FOR DELETE
    USING (
        routine_list_id IN (
            SELECT id FROM routine_lists 
            WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_routine_lists_business_id ON routine_lists(business_id);
CREATE INDEX IF NOT EXISTS idx_routine_list_items_routine_list_id ON routine_list_items(routine_list_id);
