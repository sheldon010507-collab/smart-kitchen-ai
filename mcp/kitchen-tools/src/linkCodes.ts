import type { ToolResult } from './types.js';

export interface RedeemTelegramLinkCodeInput {
  telegram_user_id: string;
  telegram_username?: string;
  code: string;
  now?: Date;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function redeemTelegramLinkCode(
  db: any,
  input: RedeemTelegramLinkCodeInput,
): Promise<ToolResult<{ supabase_user_id: string; default_business_id: string | null }>> {
  const telegramUserId = String(input.telegram_user_id || '').trim();
  const code = normalizeCode(input.code || '');

  if (!telegramUserId) return { ok: false, error: 'telegram_user_id is required' };
  if (!code) return { ok: false, error: 'link code is required' };

  const { data: linkCode, error: fetchError } = await db
    .from('telegram_link_codes')
    .select('id, code, supabase_user_id, default_business_id, expires_at, used_at')
    .eq('code', code)
    .is('used_at', null)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!linkCode) return { ok: false, error: 'Link code expired or already used' };

  const now = input.now || new Date();
  if (linkCode.used_at || new Date(linkCode.expires_at) <= now) {
    return { ok: false, error: 'Link code expired or already used' };
  }

  const supabaseUserId = linkCode.supabase_user_id as string;
  const defaultBusinessId = (linkCode.default_business_id as string | null) || null;

  const { data: claimedCode, error: claimError } = await db
    .from('telegram_link_codes')
    .update({
      used_at: now.toISOString(),
      telegram_user_id: telegramUserId,
    })
    .eq('id', linkCode.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle();

  if (claimError) return { ok: false, error: claimError.message };
  if (!claimedCode) return { ok: false, error: 'Link code expired or already used' };

  const { error: upsertError } = await db
    .from('telegram_user_links')
    .upsert({
      telegram_user_id: telegramUserId,
      telegram_username: input.telegram_username || null,
      supabase_user_id: supabaseUserId,
      default_business_id: defaultBusinessId,
      is_active: true,
    }, { onConflict: 'telegram_user_id' });

  if (upsertError) return { ok: false, error: upsertError.message };

  return {
    ok: true,
    data: {
      supabase_user_id: supabaseUserId,
      default_business_id: defaultBusinessId,
    },
  };
}
