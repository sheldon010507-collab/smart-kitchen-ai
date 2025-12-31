-- ============================================================
-- STEP 1: RLS HELPER FUNCTIONS
-- ============================================================
-- Run this FIRST in Supabase SQL Editor
-- This creates reusable helper functions for RLS policies
-- ============================================================

-- 1. Check if user is an active member of a business
CREATE OR REPLACE FUNCTION is_active_member(p_business_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_active_member(uuid) IS 'Check if current user is an active member of the given business';

-- 2. Check if user has access to a business (owner OR active member)
CREATE OR REPLACE FUNCTION has_business_access(p_business_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION has_business_access(uuid) IS 'Check if current user owns or is an active member of the given business';

-- 3. Check if user is the owner of a business
CREATE OR REPLACE FUNCTION is_business_owner(p_business_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses WHERE id = p_business_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_business_owner(uuid) IS 'Check if current user owns the given business';

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to verify functions are created:
-- SELECT proname FROM pg_proc WHERE proname IN ('is_active_member', 'has_business_access', 'is_business_owner');
