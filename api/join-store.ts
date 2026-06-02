import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizeJoinCode(value: unknown): string {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Join store service is not configured.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  if (!token) return res.status(401).json({ error: 'Please sign in again.' });

  const code = normalizeJoinCode(req.body?.code);
  if (!code) return res.status(400).json({ error: 'Store code is required.' });

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userResult.user) {
    return res.status(401).json({ error: 'Please sign in again.' });
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, name, owner_id')
    .eq('join_code', code)
    .maybeSingle();

  if (businessError) {
    console.error('Join store lookup failed:', businessError);
    return res.status(500).json({ error: 'Could not check store code.' });
  }

  if (!business) {
    return res.status(404).json({ error: 'Store code not found.' });
  }

  if (business.owner_id === userResult.user.id) {
    return res.status(409).json({ error: 'You already own this store.' });
  }

  const { data: existingMembership, error: membershipLookupError } = await supabase
    .from('business_members')
    .select('id')
    .eq('business_id', business.id)
    .eq('user_id', userResult.user.id)
    .maybeSingle();

  if (membershipLookupError) {
    console.error('Join store membership lookup failed:', membershipLookupError);
    return res.status(500).json({ error: 'Could not check store membership.' });
  }

  const membershipPayload = {
    role: 'staff',
    status: 'active',
  };

  const joinRequest = existingMembership
    ? supabase
      .from('business_members')
      .update(membershipPayload)
      .eq('id', existingMembership.id)
    : supabase
      .from('business_members')
      .insert({
        business_id: business.id,
        user_id: userResult.user.id,
        ...membershipPayload,
      });

  const { error: joinError } = await joinRequest;

  if (joinError) {
    console.error('Join store membership failed:', joinError);
    return res.status(500).json({ error: 'Could not join store.' });
  }

  return res.status(200).json({
    business: {
      id: business.id,
      name: business.name,
      ownerId: business.owner_id,
    },
  });
}
