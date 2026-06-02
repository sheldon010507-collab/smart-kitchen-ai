-- Fix shopping list uniqueness for manual Telegram items.
-- The old constraint treated all pending rows with inventory_item_id = NULL
-- as duplicates, so adding "onion" could block "rice" in the same store.

ALTER TABLE shopping_list
  DROP CONSTRAINT IF EXISTS unique_pending_inventory_item;

CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_inventory_item_not_null
  ON shopping_list (business_id, inventory_item_id)
  WHERE status = 'pending' AND inventory_item_id IS NOT NULL;
