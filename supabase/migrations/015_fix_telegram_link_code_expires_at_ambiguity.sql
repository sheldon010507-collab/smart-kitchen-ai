-- Fix create_telegram_link_code() ambiguity between the output column
-- expires_at and telegram_link_codes.expires_at.

CREATE OR REPLACE FUNCTION create_telegram_link_code(p_default_business_id UUID DEFAULT NULL)
RETURNS TABLE(code TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
DECLARE
  generated_code TEXT;
  created_code TEXT;
  created_expires_at TIMESTAMPTZ;
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
    AND telegram_link_codes.expires_at > now();

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
      INTO created_code, created_expires_at;

      code := created_code;
      expires_at := created_expires_at;
      RETURN NEXT;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      -- Try another 6-digit code.
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION create_telegram_link_code(UUID) TO authenticated;
