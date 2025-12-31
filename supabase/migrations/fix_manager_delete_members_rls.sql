-- Migration: Fix Manager Delete Members Permission
-- Issue: Manager cannot delete staff members from business_members table

-- =============================================
-- 1. Add explicit DELETE policy for business owners
-- =============================================

DO $$
BEGIN
    -- Drop existing policy if it exists (to recreate with correct settings)
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'business_members' 
        AND policyname = 'Allow owner to delete members'
    ) THEN
        EXECUTE 'DROP POLICY "Allow owner to delete members" ON business_members';
    END IF;

    -- Create DELETE policy for business owners
    EXECUTE 'CREATE POLICY "Allow owner to delete members" ON business_members
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM businesses 
                WHERE id = business_members.business_id 
                AND owner_id = auth.uid()
            )
        )';
END $$;

-- =============================================
-- 2. Add explicit UPDATE policy for business owners (for approve action)
-- =============================================

DO $$
BEGIN
    -- Drop existing policy if it exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'business_members' 
        AND policyname = 'Allow owner to update members'
    ) THEN
        EXECUTE 'DROP POLICY "Allow owner to update members" ON business_members';
    END IF;

    -- Create UPDATE policy for business owners
    EXECUTE 'CREATE POLICY "Allow owner to update members" ON business_members
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM businesses 
                WHERE id = business_members.business_id 
                AND owner_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM businesses 
                WHERE id = business_members.business_id 
                AND owner_id = auth.uid()
            )
        )';
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================
-- Instructions: Run this in your Supabase SQL Editor
-- =============================================
