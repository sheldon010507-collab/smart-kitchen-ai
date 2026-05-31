-- ============================================================
-- One-time Telegram link codes for OpenClaw Kitchen Brain
-- Users generate codes from the authenticated web app, then send
-- /link CODE to Telegram. MCP redeems codes with service-role access.
-- ============================================================

CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  telegram_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_user_created
  ON telegram_link_codes(supabase_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code_unused
  ON telegram_link_codes(code)
  WHERE used_at IS NULL;

ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telegram_link_codes_select_own" ON telegram_link_codes;
CREATE POLICY "telegram_link_codes_select_own"
  ON telegram_link_codes FOR SELECT
  USING (supabase_user_id = auth.uid());

DROP POLICY IF EXISTS "telegram_link_codes_insert_own" ON telegram_link_codes;
CREATE POLICY "telegram_link_codes_insert_own"
  ON telegram_link_codes FOR INSERT
  WITH CHECK (
    supabase_user_id = auth.uid()
    AND (
      default_business_id IS NULL
      OR has_business_access(default_business_id)
    )
  );

DROP POLICY IF EXISTS "telegram_link_codes_update_own_unused" ON telegram_link_codes;
CREATE POLICY "telegram_link_codes_update_own_unused"
  ON telegram_link_codes FOR UPDATE
  USING (supabase_user_id = auth.uid() AND used_at IS NULL)
  WITH CHECK (supabase_user_id = auth.uid());

CREATE OR REPLACE FUNCTION create_telegram_link_code(p_default_business_id UUID DEFAULT NULL)
RETURNS TABLE(code TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
DECLARE
  generated_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_default_business_id IS NOT NULL AND NOT has_business_access(p_default_business_id) THEN
    RAISE EXCEPTION 'default business is not accessible';
  END IF;

  UPDATE telegram_link_codes
  SET used_at = now()
  WHERE supabase_user_id = auth.uid()
    AND used_at IS NULL
    AND expires_at > now();

  LOOP
    generated_code := 'SK-' || lpad(floor(random() * 1000000)::int::text, 6, '0');
    BEGIN
      INSERT INTO telegram_link_codes (
        code,
        supabase_user_id,
        default_business_id,
        expires_at
      )
      VALUES (
        generated_code,
        auth.uid(),
        p_default_business_id,
        now() + interval '10 minutes'
      )
      RETURNING telegram_link_codes.code, telegram_link_codes.expires_at
      INTO code, expires_at;

      RETURN NEXT;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      -- Try another 6-digit code.
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION create_telegram_link_code(UUID) TO authenticated;

COMMENT ON TABLE telegram_link_codes IS 'Short-lived one-time codes used to link Telegram accounts to authenticated Smart Kitchen users.';
COMMENT ON FUNCTION create_telegram_link_code(UUID) IS 'Creates a 10-minute Telegram link code for the authenticated user and optional accessible default business.';
