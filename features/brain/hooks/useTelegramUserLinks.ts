import { useCallback, useEffect, useState } from 'react';
import { fetchTelegramUserLinks, formatTelegramLinkError, TelegramUserLink } from '../services/telegramLinkService';

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
            setError(formatTelegramLinkError(err));
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
