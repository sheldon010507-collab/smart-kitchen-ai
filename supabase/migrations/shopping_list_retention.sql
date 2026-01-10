-- Shopping List Data Retention Policy
-- Delete purchased/cancelled items older than 1 month
-- Run this as a scheduled job (pg_cron or Supabase Edge Function)

-- 1. Create function to clean old records
CREATE OR REPLACE FUNCTION clean_old_shopping_list_items()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM shopping_list
    WHERE status IN ('purchased', 'cancelled')
    AND updated_at < NOW() - INTERVAL '1 month';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % old shopping list items', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 2. Option A: Manual execution (run monthly)
-- SELECT clean_old_shopping_list_items();

-- 3. Option B: If pg_cron is enabled, schedule it
-- SELECT cron.schedule(
--     'clean-shopping-list-monthly',
--     '0 3 1 * *',  -- Run at 3 AM on 1st of each month
--     'SELECT clean_old_shopping_list_items()'
-- );

-- 4. Quick verification - see what would be deleted
-- SELECT COUNT(*) as items_to_delete
-- FROM shopping_list
-- WHERE status IN ('purchased', 'cancelled')
-- AND updated_at < NOW() - INTERVAL '1 month';
