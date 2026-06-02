import { supabase } from './supabase.js';
import type { AccessibleBusiness, ResolvedActor, TelegramActorInput } from './types.js';

export async function resolveActor(input: TelegramActorInput): Promise<ResolvedActor> {
  const telegramUserId = String(input.telegram_user_id || '').trim();
  if (!telegramUserId) {
    return { linked: false, telegram_user_id: '', accessible_businesses: [], error: 'telegram_user_id is required' };
  }

  const { data: link, error: linkError } = await supabase
    .from('telegram_user_links')
    .select('telegram_user_id, telegram_username, supabase_user_id, default_business_id, is_active')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle();

  if (linkError) {
    return { linked: false, telegram_user_id: telegramUserId, accessible_businesses: [], error: linkError.message };
  }

  if (!link || !link.is_active) {
    return {
      linked: false,
      telegram_user_id: telegramUserId,
      telegram_username: input.telegram_username,
      accessible_businesses: [],
      error: 'Telegram account is not linked to a Smart Kitchen user',
    };
  }

  await supabase
    .from('telegram_user_links')
    .update({
      last_seen_at: new Date().toISOString(),
      telegram_username: input.telegram_username || link.telegram_username || null,
    })
    .eq('telegram_user_id', telegramUserId);

  const userId = link.supabase_user_id as string;

  const { data: ownedBusinesses, error: ownedError } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', userId);

  if (ownedError) {
    return { linked: true, telegram_user_id: telegramUserId, supabase_user_id: userId, accessible_businesses: [], error: ownedError.message };
  }

  const { data: memberBusinesses, error: memberError } = await supabase
    .from('business_members')
    .select('business_id, role, businesses(id, name)')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (memberError) {
    return { linked: true, telegram_user_id: telegramUserId, supabase_user_id: userId, accessible_businesses: [], error: memberError.message };
  }

  const byId = new Map<string, AccessibleBusiness>();

  for (const business of ownedBusinesses || []) {
    byId.set(business.id, { business_id: business.id, name: business.name, access_role: 'owner' });
  }

  for (const membership of memberBusinesses || []) {
    const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
    if (!business?.id) continue;

    const accessRole = membership.role === 'owner' ? 'owner' : 'staff';
    const existing = byId.get(business.id);
    if (!existing || accessRole === 'owner') {
      byId.set(business.id, { business_id: business.id, name: business.name, access_role: accessRole });
    }
  }

  const accessible = [...byId.values()];

  return {
    linked: true,
    telegram_user_id: telegramUserId,
    telegram_username: input.telegram_username || link.telegram_username || undefined,
    supabase_user_id: userId,
    role: accessible.some(business => business.access_role === 'owner') ? 'Manager' : 'Staff',
    default_business_id: link.default_business_id,
    accessible_businesses: accessible,
  };
}

function normalizeName(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/[^\p{Letter}\p{Number}\s]/gu, '').replace(/\s+/g, ' ');
}

export async function listAccessibleBusinesses(input: TelegramActorInput) {
  const actor = await resolveActor(input);
  if (!actor.linked || !actor.supabase_user_id) {
    return { ok: false, error: actor.error || 'Telegram account is not linked' };
  }

  return {
    ok: true,
    data: {
      telegram_user_id: actor.telegram_user_id,
      supabase_user_id: actor.supabase_user_id,
      default_business_id: actor.default_business_id || null,
      businesses: actor.accessible_businesses.map(business => ({
        ...business,
        is_default: business.business_id === actor.default_business_id,
      })),
    },
  };
}

export async function setDefaultBusiness(input: TelegramActorInput & { business_id?: string; business_name?: string }) {
  const actor = await resolveActor(input);
  if (!actor.linked || !actor.supabase_user_id) {
    return { ok: false, error: actor.error || 'Telegram account is not linked' };
  }

  const target = input.business_id
    ? actor.accessible_businesses.find(business => business.business_id === input.business_id)
    : input.business_name
      ? actor.accessible_businesses.find(business => normalizeName(business.name) === normalizeName(input.business_name || ''))
        || actor.accessible_businesses.find(business => {
          const candidate = normalizeName(business.name);
          const requested = normalizeName(input.business_name || '');
          return candidate.includes(requested) || requested.includes(candidate);
        })
      : null;

  if (!target) {
    return {
      ok: false,
      clarification: `Which store should I set as default? Options: ${actor.accessible_businesses.map(business => business.name).join(', ')}`,
    };
  }

  const { error } = await supabase
    .from('telegram_user_links')
    .update({ default_business_id: target.business_id })
    .eq('telegram_user_id', actor.telegram_user_id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { default_business_id: target.business_id, business_name: target.name } };
}
