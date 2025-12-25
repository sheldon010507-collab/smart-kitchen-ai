-- ✅ P1 Fix: Create otp_codes table for persistent OTP storage
-- Run this in Supabase SQL Editor

-- Create the otp_codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'unknown',
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for fast lookups
    CONSTRAINT unique_email_role UNIQUE (email, role)
);

-- Create index for faster cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);

-- Auto-cleanup function (optional - Supabase cron job)
-- This deletes expired OTPs automatically
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (Service role only - no direct client access)
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access (used by API endpoints)
-- No client-side access allowed
CREATE POLICY "Service role only" ON otp_codes
    FOR ALL
    USING (false)
    WITH CHECK (false);

-- Grant access to service role
GRANT ALL ON otp_codes TO service_role;

-- IMPORTANT: Add SUPABASE_SERVICE_ROLE_KEY to your Vercel environment variables
-- This is required for the OTP endpoints to work

COMMENT ON TABLE otp_codes IS 'Stores one-time passwords for email verification. Accessed only by server-side API.';
