import React, { useState } from 'react';
import { Link2, RefreshCw, Save } from 'lucide-react';
import { useAuthContext } from '../../../lib/AuthContext';
import { useBusiness } from '../../../lib/BusinessContext';
import { useTelegramUserLinks } from '../hooks/useTelegramUserLinks';
import { updateTelegramLinkActive, upsertTelegramUserLink } from '../services/telegramLinkService';

export function TelegramLinkManager() {
    const { user } = useAuthContext();
    const { accessibleBusinesses, currentBusinessId } = useBusiness();
    const { links, loading, error, refresh } = useTelegramUserLinks(50);
    const [telegramUserId, setTelegramUserId] = useState('');
    const [telegramUsername, setTelegramUsername] = useState('');
    const [supabaseUserId, setSupabaseUserId] = useState(user?.id || '');
    const [defaultBusinessId, setDefaultBusinessId] = useState(currentBusinessId || '');
    const [saving, setSaving] = useState(false);

    const canManage = user?.user_metadata?.role === 'Manager';

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !telegramUserId.trim() || !supabaseUserId.trim()) return;
        setSaving(true);
        try {
            await upsertTelegramUserLink({
                telegramUserId,
                telegramUsername,
                supabaseUserId,
                defaultBusinessId: defaultBusinessId || null,
                linkedBy: user.id,
                isActive: true,
            });
            setTelegramUserId('');
            setTelegramUsername('');
            await refresh();
        } catch (err: any) {
            alert(err?.message || 'Failed to save Telegram link');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Telegram Links</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Map Telegram users to existing Smart Kitchen users and stores</p>
                    </div>
                </div>
                <button onClick={refresh} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {canManage && (
                <form onSubmit={handleSave} className="p-5 grid grid-cols-1 md:grid-cols-5 gap-3 border-b border-gray-100 dark:border-gray-700">
                    <input
                        value={telegramUserId}
                        onChange={e => setTelegramUserId(e.target.value)}
                        placeholder="Telegram user ID"
                        className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
                    />
                    <input
                        value={telegramUsername}
                        onChange={e => setTelegramUsername(e.target.value)}
                        placeholder="Username (optional)"
                        className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
                    />
                    <input
                        value={supabaseUserId}
                        onChange={e => setSupabaseUserId(e.target.value)}
                        placeholder="Supabase user ID"
                        className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
                    />
                    <select
                        value={defaultBusinessId}
                        onChange={e => setDefaultBusinessId(e.target.value)}
                        className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
                    >
                        <option value="">No default store</option>
                        {accessibleBusinesses.map(business => (
                            <option key={business.id} value={business.id}>{business.name}</option>
                        ))}
                    </select>
                    <button
                        disabled={saving || !telegramUserId.trim() || !supabaseUserId.trim()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        Save
                    </button>
                </form>
            )}

            {error ? (
                <div className="p-5 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300">{error}</div>
            ) : links.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No Telegram links yet.</div>
            ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {links.map(link => (
                        <div key={link.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <div className="font-semibold text-sm text-gray-900 dark:text-white">
                                    {link.telegramUsername ? `@${link.telegramUsername}` : 'Telegram user'}
                                    <span className="ml-2 text-xs text-gray-500">{link.telegramUserId}</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Supabase: {link.supabaseUserId} · Default store: {link.defaultBusinessId || 'none'}
                                </div>
                            </div>
                            {canManage && (
                                <button
                                    onClick={async () => { await updateTelegramLinkActive(link.id, !link.isActive); await refresh(); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${link.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {link.isActive ? 'Active' : 'Inactive'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
