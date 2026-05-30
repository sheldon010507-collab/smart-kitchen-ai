import { supabase } from '../../../lib/supabase';

export interface TelegramUserLink {
    id: string;
    telegramUserId: string;
    telegramUsername?: string | null;
    supabaseUserId: string;
    defaultBusinessId?: string | null;
    isActive: boolean;
    linkedBy?: string | null;
    linkedAt: string;
    lastSeenAt?: string | null;
}

export function mapTelegramUserLink(row: any): TelegramUserLink {
    return {
        id: row.id,
        telegramUserId: row.telegram_user_id,
        telegramUsername: row.telegram_username,
        supabaseUserId: row.supabase_user_id,
        defaultBusinessId: row.default_business_id,
        isActive: row.is_active,
        linkedBy: row.linked_by,
        linkedAt: row.linked_at,
        lastSeenAt: row.last_seen_at,
    };
}

export async function fetchTelegramUserLinks(limit = 50) {
    const { data, error } = await supabase
        .from('telegram_user_links')
        .select('*')
        .order('linked_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data || []).map(mapTelegramUserLink);
}

export async function upsertTelegramUserLink(input: {
    telegramUserId: string;
    telegramUsername?: string;
    supabaseUserId: string;
    defaultBusinessId?: string | null;
    linkedBy?: string;
    isActive?: boolean;
}) {
    const { error } = await supabase.from('telegram_user_links').upsert({
        telegram_user_id: input.telegramUserId.trim(),
        telegram_username: input.telegramUsername?.trim() || null,
        supabase_user_id: input.supabaseUserId,
        default_business_id: input.defaultBusinessId || null,
        linked_by: input.linkedBy || null,
        is_active: input.isActive ?? true,
    }, {
        onConflict: 'telegram_user_id',
    });

    if (error) throw error;
}

export async function updateTelegramLinkActive(id: string, isActive: boolean) {
    const { error } = await supabase
        .from('telegram_user_links')
        .update({ is_active: isActive })
        .eq('id', id);

    if (error) throw error;
}
