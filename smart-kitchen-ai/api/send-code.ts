
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { otpStore } from './_storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Generate 6 digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + (parseInt(process.env.OTP_EXPIRES_MINUTES || '10') * 60 * 1000);

  // Store code (In-memory - see _storage.ts warning about Vercel persistence)
  // Key is email+role to allow same email to have different codes for different roles if needed
  otpStore.set(`${email}:${role}`, { code, expires });

  try {
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
    return res.status(500).json({ error: 'Failed to send verification email', details: error.message });
  }
}
