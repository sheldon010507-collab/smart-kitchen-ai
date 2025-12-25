
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ✅ P1 Fix: Use Supabase for persistent OTP verification
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Brute force protection (per-instance)
const verifyAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_VERIFY_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, role, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const emailKey = (email as string).toLowerCase();
  const key = `${emailKey}:${role || 'unknown'}`;

  // Check if blocked due to too many attempts
  const now = Date.now();
  const attempt = verifyAttempts.get(key);
  if (attempt && now < attempt.blockedUntil) {
    const remainingMinutes = Math.ceil((attempt.blockedUntil - now) / 60000);
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${remainingMinutes} minutes.` });
  }

  try {
    let isValid = false;

    // ✅ Try Supabase first (persistent storage)
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: otpRecord, error: fetchError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', emailKey)
        .eq('role', role || 'unknown')
        .single();

      if (fetchError || !otpRecord) {
        // Record failed attempt
        recordFailedAttempt(key);
        return res.status(400).json({ error: 'Invalid or expired code' });
      }

      // Check expiration
      if (new Date() > new Date(otpRecord.expires_at)) {
        // Delete expired OTP
        await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
        recordFailedAttempt(key);
        return res.status(400).json({ error: 'Code expired. Please request a new one.' });
      }

      // Check code match
      if (otpRecord.code !== code) {
        // Increment attempts in DB
        const newAttempts = (otpRecord.attempts || 0) + 1;

        if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
          // Delete OTP and block
          await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
          recordFailedAttempt(key, true); // Block the key
          return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
        }

        await supabase
          .from('otp_codes')
          .update({ attempts: newAttempts })
          .eq('id', otpRecord.id);

        recordFailedAttempt(key);
        return res.status(400).json({ error: 'Invalid code' });
      }

      // Success! Delete the used OTP
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
      isValid = true;

    } else {
      // Fallback to in-memory store
      const { otpStore } = await import('./_storage');
      const record = otpStore.get(key);

      if (!record) {
        recordFailedAttempt(key);
        return res.status(400).json({ error: 'Invalid or expired code' });
      }

      if (Date.now() > record.expires) {
        otpStore.delete(key);
        recordFailedAttempt(key);
        return res.status(400).json({ error: 'Code expired' });
      }

      if (record.code !== code) {
        recordFailedAttempt(key);
        return res.status(400).json({ error: 'Invalid code' });
      }

      // Success
      otpStore.delete(key);
      isValid = true;
    }

    if (isValid) {
      // Clear any failed attempt records on success
      verifyAttempts.delete(key);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Verification failed' });

  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Verification service error' });
  }
}

function recordFailedAttempt(key: string, block: boolean = false) {
  const now = Date.now();
  const existing = verifyAttempts.get(key);

  if (block) {
    verifyAttempts.set(key, { count: MAX_VERIFY_ATTEMPTS, blockedUntil: now + BLOCK_DURATION_MS });
    return;
  }

  if (existing) {
    existing.count++;
    if (existing.count >= MAX_VERIFY_ATTEMPTS) {
      existing.blockedUntil = now + BLOCK_DURATION_MS;
    }
  } else {
    verifyAttempts.set(key, { count: 1, blockedUntil: 0 });
  }
}
