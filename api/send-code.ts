
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// ✅ P1 Fix: Use Supabase for persistent OTP storage instead of in-memory Map
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role for admin operations

// Simple rate limit tracking (per-instance, for basic protection)
const sendAttempts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_SENDS = 3; // Max 3 emails per minute per email address

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, role } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Rate limiting check
  const now = Date.now();
  const emailKey = email.toLowerCase();
  const attempt = sendAttempts.get(emailKey);

  if (attempt && now < attempt.resetTime) {
    if (attempt.count >= RATE_LIMIT_MAX_SENDS) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }
    attempt.count++;
  } else {
    sendAttempts.set(emailKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  }

  // Generate 6 digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRES_MINUTES || '10') * 60 * 1000));

  try {
    // ✅ Store OTP in Supabase (requires otp_codes table)
    // If Supabase is not configured, fall back to in-memory (with warning)
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Delete any existing OTP for this email+role
      await supabase
        .from('otp_codes')
        .delete()
        .eq('email', emailKey)
        .eq('role', role || 'unknown');

      // Insert new OTP
      const { error: insertError } = await supabase
        .from('otp_codes')
        .insert({
          email: emailKey,
          role: role || 'unknown',
          code,
          expires_at: expiresAt.toISOString(),
          attempts: 0
        });

      if (insertError) {
        console.error('OTP storage error:', insertError);
        // Continue anyway - email will still be sent
      }
    } else {
      console.warn('OTP Storage: Supabase not configured. OTP may not persist across serverless instances.');
      // Import and use the old in-memory store as fallback
      const { otpStore } = await import('./_storage');
      otpStore.set(`${emailKey}:${role}`, { code, expires: expiresAt.getTime() });
    }

    // Configure Nodemailer with Gmail OAuth2
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN
      }
    });

    // Send email
    await transporter.sendMail({
      from: `Smart Kitchen <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Smart Kitchen Login Code',
      text: `Your login code is: ${code}. It expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2>Login Verification</h2>
          <p>Your one-time login code is:</p>
          <h1 style="background: #f4f4f5; padding: 10px 20px; display: inline-block; border-radius: 8px; letter-spacing: 5px;">${code}</h1>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">This code expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.</p>
        </div>
      `
    });

    return res.status(200).json({ message: 'Code sent successfully' });
  } catch (error: any) {
    console.error('Email error:', error);
    // ✅ P3 Fix: Don't expose detailed error to client
    return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }
}
