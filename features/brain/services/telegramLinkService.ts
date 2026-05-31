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

export function formatTelegramLinkError(error: any) {
    const message = String(error?.message || error || '');
    if (
        message.includes('telegram_user_links') ||
        message.includes('telegram_link_codes') ||
        message.includes('schema cache')
    ) {
        return 'Telegram setup is not installed yet. Apply the Kitchen Brain Supabase migrations, then refresh this page.';
    }
    return message || 'Failed to load Telegram links.';
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

export async function updateTelegramLinkActive(id: string, isActive: boolean) {
    const { error } = await supabase
        .from('telegram_user_links')
        .update({ is_active: isActive })
        .eq('id', id);

    if (error) throw error;
}
