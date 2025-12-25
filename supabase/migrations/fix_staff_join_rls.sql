-- Migration: Fix Staff Join Store RLS Policies
-- Issue: Staff cannot join stores because they lack INSERT permission on business_members
-- and SELECT permission on businesses (to look up by join_code)

-- =============================================
-- 1. Allow anyone authenticated to SELECT businesses by join_code
-- This is needed so Staff can look up a business to join
-- =============================================

-- First check if policy exists, if not create it
DO $$
BEGIN
    -- Policy for selecting businesses by join_code (for join flow)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'businesses' 
        AND policyname = 'Allow SELECT by join_code'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow SELECT by join_code" ON businesses
            FOR SELECT
            USING (
                join_code IS NOT NULL
            )';
    END IF;
END $$;

-- =============================================
-- 2. Allow authenticated users to INSERT themselves into business_members
-- This is the key policy that allows staff to join a store
-- =============================================

DO $$
BEGIN
    -- Policy for staff to insert themselves as members
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'business_members' 
        AND policyname = 'Allow self-insert for authenticated users'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow self-insert for authenticated users" ON business_members
            FOR INSERT
            WITH CHECK (
                auth.uid() = user_id
            )';
    END IF;
END $$;

-- =============================================
-- 3. Allow users to SELECT their own memberships
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'business_members' 
        AND policyname = 'Allow SELECT own memberships'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow SELECT own memberships" ON business_members
            FOR SELECT
            USING (
                auth.uid() = user_id
            )';
    END IF;
END $$;

-- =============================================
-- 4. Enable RLS on both tables if not already enabled
-- =============================================

ALTER TABLE IF EXISTS businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS business_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. Add policy for business owners to see all members
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'business_members' 
        AND policyname = 'Allow owner to see all members'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow owner to see all members" ON business_members
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM businesses 
                    WHERE id = business_members.business_id 
                    AND owner_id = auth.uid()
                )
            )';
    END IF;
END $$;

-- =============================================
-- 6. Add policy for business owners to manage members
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'business_members' 
        AND policyname = 'Allow owner to manage members'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow owner to manage members" ON business_members
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM businesses 
                    WHERE id = business_members.business_id 
                    AND owner_id = auth.uid()
                )
            )';
    END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
