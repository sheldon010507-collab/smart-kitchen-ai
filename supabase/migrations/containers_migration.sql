-- Container Registration Migration
-- Run this in Supabase SQL Editor

-- 容器表
CREATE TABLE IF NOT EXISTS containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity_value NUMERIC NOT NULL,
    capacity_unit TEXT NOT NULL DEFAULT 'L',
    images JSONB DEFAULT '[]',
    visual_features JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;

-- RLS Policy (使用 business_members)
CREATE POLICY "Users can view own containers"
    ON containers FOR SELECT
    USING (business_id IN (
        SELECT business_id FROM business_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own containers"
    ON containers FOR INSERT
    WITH CHECK (business_id IN (
        SELECT business_id FROM business_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update own containers"
    ON containers FOR UPDATE
    USING (business_id IN (
        SELECT business_id FROM business_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own containers"
    ON containers FOR DELETE
    USING (business_id IN (
        SELECT business_id FROM business_members WHERE user_id = auth.uid()
    ));

-- Index
CREATE INDEX IF NOT EXISTS idx_containers_business ON containers(business_id);

-- 擴展 scan_corrections 表支持填充度學習
-- (如果 fill_level 列不存在則添加)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scan_corrections' AND column_name = 'container_id'
    ) THEN
        ALTER TABLE scan_corrections ADD COLUMN container_id UUID REFERENCES containers(id) ON DELETE SET NULL;
    END IF;
END $$;
