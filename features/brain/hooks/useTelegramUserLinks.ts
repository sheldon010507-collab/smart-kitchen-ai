import { useCallback, useEffect, useState } from 'react';
import { fetchTelegramUserLinks, TelegramUserLink } from '../services/telegramLinkService';

export function useTelegramUserLinks(limit = 50) {
    const [links, setLinks] = useState<TelegramUserLink[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setLinks(await fetchTelegramUserLinks(limit));
        } catch (err: any) {
            setError(err?.message || 'Failed to load Telegram links. Apply the telegram_user_links migration first.');
            setLinks([]);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { links, loading, error, refresh };
}
