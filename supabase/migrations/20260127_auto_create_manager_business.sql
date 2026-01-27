-- ============================================
-- Manager Business Creation Protection
-- Database-Level Safeguards (Optional)
-- ============================================

-- Purpose: 
-- This SQL script provides database-level protection to ensure
-- Manager accounts always have a business created, even if the
-- application logic fails.

-- When to use:
-- This is an OPTIONAL backup layer. The auto-recovery hook in
-- the application should handle most cases. Use this if you want
-- maximum reliability.

-- ============================================
-- 1. Database Function: Auto-create business for new Manager
-- ============================================

CREATE OR REPLACE FUNCTION auto_create_manager_business()
RETURNS TRIGGER AS $$
DECLARE
    new_business_id uuid;
    manager_name text;
BEGIN
    -- Only proceed if this is a Manager user
    IF (NEW.raw_user_meta_data->>'role') = 'Manager' THEN
        
        -- Check if business already exists
        IF NOT EXISTS (
            SELECT 1 FROM businesses WHERE owner_id = NEW.id
        ) THEN
            -- Get manager's name or email
            manager_name := COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                split_part(NEW.email, '@', 1)
            );
            
            -- Create business
            INSERT INTO businesses (owner_id, name, invite_code)
            VALUES (
                NEW.id,
                manager_name || '''s Restaurant',
                substring(md5(random()::text), 1, 8)
            )
            RETURNING id INTO new_business_id;
            
            -- Create owner membership
            INSERT INTO business_members (business_id, user_id, role, status)
            VALUES (new_business_id, NEW.id, 'owner', 'active');
            
            RAISE NOTICE 'Auto-created business % for manager %', new_business_id, NEW.email;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Trigger: Run after user email confirmation
-- ============================================

DROP TRIGGER IF EXISTS trigger_auto_create_manager_business ON auth.users;

CREATE TRIGGER trigger_auto_create_manager_business
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
    EXECUTE FUNCTION auto_create_manager_business();

-- ============================================
-- 3. Policy: Ensure RLS doesn't block auto-creation
-- ============================================

-- Note: This assumes you have RLS enabled on businesses table
-- Adjust based on your actual RLS policies

-- Allow the trigger function to insert
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow trigger to create business"
ON businesses
FOR INSERT
WITH CHECK (true);

-- ============================================
-- Testing
-- ============================================

-- To test this trigger:
-- 1. Create a new user with role='Manager' but keep email_confirmed_at as NULL
-- 2. Manually confirm the email by updating email_confirmed_at
-- 3. Check if business was auto-created

/*
Example test:

-- 1. Insert unconfirmed manager (won't work in production, just for testing)
INSERT INTO auth.users (
    id, email, encrypted_password, 
    raw_user_meta_data, email_confirmed_at
)
VALUES (
    gen_random_uuid(),
    'testmanager@test.com',
    crypt('password', gen_salt('bf')),
    '{"role": "Manager", "full_name": "Test Manager"}'::jsonb,
    NULL  -- Not confirmed yet
);

-- 2. Simulate email confirmation
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'testmanager@test.com';

-- 3. Check if business was created
SELECT b.*, bm.role, bm.status
FROM businesses b
JOIN business_members bm ON b.id = bm.business_id
JOIN auth.users u ON b.owner_id = u.id
WHERE u.email = 'testmanager@test.com';
*/

-- ============================================
-- Rollback (if needed)
-- ============================================

-- DROP TRIGGER IF EXISTS trigger_auto_create_manager_business ON auth.users;
-- DROP FUNCTION IF EXISTS auto_create_manager_business();
-- DROP POLICY IF EXISTS "Allow trigger to create business" ON businesses;
