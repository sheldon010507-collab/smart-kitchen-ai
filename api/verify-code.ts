
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { otpStore } from './_storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, role, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Missing email or code' });

  const key = `${email}:${role}`;
  const record = otpStore.get(key);

  if (!record) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  if (Date.now() > record.expires) {
    otpStore.delete(key);
    return res.status(400).json({ error: 'Code expired' });
  }

  if (record.code !== code) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  // Success - remove used code to prevent replay
  otpStore.delete(key);
  
  return res.status(200).json({ success: true });
}
