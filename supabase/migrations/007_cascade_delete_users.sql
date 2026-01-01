-- =========================================================
-- Migration: Add ON DELETE CASCADE to user foreign keys
-- Purpose: Allow user deletion without manual data cleanup
-- =========================================================

-- 1. profiles: user_id → auth.users
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. business_members: user_id → profiles
ALTER TABLE business_members 
  DROP CONSTRAINT IF EXISTS business_members_user_id_fkey,
  ADD CONSTRAINT business_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. prep_tasks: multiple user references
ALTER TABLE prep_tasks 
  DROP CONSTRAINT IF EXISTS prep_tasks_assigned_to_fkey,
  DROP CONSTRAINT IF EXISTS prep_tasks_completed_by_fkey,
  DROP CONSTRAINT IF EXISTS prep_tasks_created_by_fkey,
  ADD CONSTRAINT prep_tasks_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT prep_tasks_completed_by_fkey 
    FOREIGN KEY (completed_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT prep_tasks_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. shifts: user_id → auth.users
ALTER TABLE shifts 
  DROP CONSTRAINT IF EXISTS shifts_user_id_fkey,
  ADD CONSTRAINT shifts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. scan_corrections: created_by → profiles
ALTER TABLE scan_corrections 
  DROP CONSTRAINT IF EXISTS scan_corrections_created_by_fkey,
  ADD CONSTRAINT scan_corrections_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 6. shopping_list: created_by, updated_by → auth.users
ALTER TABLE shopping_list 
  DROP CONSTRAINT IF EXISTS shopping_list_created_by_fkey,
  DROP CONSTRAINT IF EXISTS shopping_list_updated_by_fkey,
  ADD CONSTRAINT shopping_list_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT shopping_list_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. sales_receipts: served_by → auth.users
ALTER TABLE sales_receipts 
  DROP CONSTRAINT IF EXISTS sales_receipts_served_by_fkey,
  ADD CONSTRAINT sales_receipts_served_by_fkey 
    FOREIGN KEY (served_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. inventory_state: scanned_by → auth.users
ALTER TABLE inventory_state 
  DROP CONSTRAINT IF EXISTS inventory_state_scanned_by_fkey,
  ADD CONSTRAINT inventory_state_scanned_by_fkey 
    FOREIGN KEY (scanned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 9. ai_logs: user_id → profiles
ALTER TABLE ai_logs 
  DROP CONSTRAINT IF EXISTS ai_logs_user_id_fkey,
  ADD CONSTRAINT ai_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Summary:
-- CASCADE: profiles, business_members, shifts, shopping_list (created_by)
-- SET NULL: prep_tasks, scan_corrections, sales_receipts, inventory_state, ai_logs, shopping_list (updated_by)
