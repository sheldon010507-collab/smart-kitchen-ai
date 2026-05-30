-- ============================================================
-- Telegram user links for OpenClaw Kitchen Brain
-- Maps Telegram identities to existing Supabase users while
-- preserving businesses/business_members as the source of access.
-- ============================================================

CREATE TABLE IF NOT EXISTS telegram_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL UNIQUE,
  telegram_username TEXT,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_telegram_user_links_supabase_user
  ON telegram_user_links(supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_user_links_default_business
  ON telegram_user_links(default_business_id);

ALTER TABLE telegram_user_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telegram_links_select_own_or_owned_store" ON telegram_user_links;
CREATE POLICY "telegram_links_select_own_or_owned_store"
  ON telegram_user_links FOR SELECT
  USING (
    supabase_user_id = auth.uid()
    OR linked_by = auth.uid()
    OR (default_business_id IS NOT NULL AND is_business_owner(default_business_id))
    OR EXISTS (
      SELECT 1
      FROM business_members bm
      JOIN businesses b ON b.id = bm.business_id
      WHERE bm.user_id = telegram_user_links.supabase_user_id
        AND bm.status = 'active'
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "telegram_links_insert_self_or_owned_store" ON telegram_user_links;
CREATE POLICY "telegram_links_insert_self_or_owned_store"
  ON telegram_user_links FOR INSERT
  WITH CHECK (
    supabase_user_id = auth.uid()
    OR linked_by = auth.uid()
    OR (default_business_id IS NOT NULL AND is_business_owner(default_business_id))
    OR EXISTS (
      SELECT 1
      FROM business_members bm
      JOIN businesses b ON b.id = bm.business_id
      WHERE bm.user_id = telegram_user_links.supabase_user_id
        AND bm.status = 'active'
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "telegram_links_update_self_or_owned_store" ON telegram_user_links;
CREATE POLICY "telegram_links_update_self_or_owned_store"
  ON telegram_user_links FOR UPDATE
  USING (
    supabase_user_id = auth.uid()
    OR linked_by = auth.uid()
    OR (default_business_id IS NOT NULL AND is_business_owner(default_business_id))
    OR EXISTS (
      SELECT 1
      FROM business_members bm
      JOIN businesses b ON b.id = bm.business_id
      WHERE bm.user_id = telegram_user_links.supabase_user_id
        AND bm.status = 'active'
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    supabase_user_id = auth.uid()
    OR linked_by = auth.uid()
    OR (default_business_id IS NOT NULL AND is_business_owner(default_business_id))
    OR EXISTS (
      SELECT 1
      FROM business_members bm
      JOIN businesses b ON b.id = bm.business_id
      WHERE bm.user_id = telegram_user_links.supabase_user_id
        AND bm.status = 'active'
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "telegram_links_delete_self_or_owned_store" ON telegram_user_links;
CREATE POLICY "telegram_links_delete_self_or_owned_store"
  ON telegram_user_links FOR DELETE
  USING (
    supabase_user_id = auth.uid()
    OR linked_by = auth.uid()
    OR (default_business_id IS NOT NULL AND is_business_owner(default_business_id))
    OR EXISTS (
      SELECT 1
      FROM business_members bm
      JOIN businesses b ON b.id = bm.business_id
      WHERE bm.user_id = telegram_user_links.supabase_user_id
        AND bm.status = 'active'
        AND b.owner_id = auth.uid()
    )
  );

COMMENT ON TABLE telegram_user_links IS 'Maps Telegram accounts to Supabase users for OpenClaw Kitchen Brain access control.';
COMMENT ON COLUMN telegram_user_links.default_business_id IS 'Optional default store used when a linked user has access to multiple businesses.';
