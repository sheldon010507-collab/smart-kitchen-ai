import { supabase } from '../../../lib/supabase';

export interface TelegramLinkCode {
    code: string;
    expiresAt: string;
}

export async function createTelegramLinkCode(input: {
    defaultBusinessId?: string | null;
} = {}): Promise<TelegramLinkCode> {
    const { data, error } = await supabase.rpc('create_telegram_link_code', {
        p_default_business_id: input.defaultBusinessId || null,
    });

    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.code || !row?.expires_at) {
        throw new Error('Failed to create Telegram link code');
    }

    return {
        code: row.code,
        expiresAt: row.expires_at,
    };
}
