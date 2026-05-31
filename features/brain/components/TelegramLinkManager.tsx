import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clipboard, KeyRound, Link2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuthContext } from '../../../lib/AuthContext';
import { useBusiness } from '../../../lib/BusinessContext';
import { useTelegramUserLinks } from '../hooks/useTelegramUserLinks';
import { createTelegramLinkCode, TelegramLinkCode } from '../services/telegramLinkCodeService';
import { formatTelegramLinkError, updateTelegramLinkActive } from '../services/telegramLinkService';

function shortId(value?: string | null) {
    if (!value) return 'none';
    return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function formatTime(value: string) {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TelegramLinkManager() {
    const { user } = useAuthContext();
    const { accessibleBusinesses, currentBusinessId } = useBusiness();
    const { links, loading, error, refresh } = useTelegramUserLinks(50);
    const [defaultBusinessId, setDefaultBusinessId] = useState(currentBusinessId || accessibleBusinesses[0]?.id || '');
    const [linkCode, setLinkCode] = useState<TelegramLinkCode | null>(null);
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const businessById = useMemo(() => {
        return new Map(accessibleBusinesses.map(business => [business.id, business.name]));
    }, [accessibleBusinesses]);

    const role = user?.user_metadata?.role === 'Manager' ? 'manager' : 'staff';
    const command = linkCode ? `/link ${linkCode.code}` : '';

    const handleGenerate = async () => {
        if (!user) return;
        setGenerating(true);
        setGenerateError(null);
        setCopied(false);
        try {
            const result = await createTelegramLinkCode({
                defaultBusinessId: defaultBusinessId || null,
            });
            setLinkCode(result);
        } catch (err: any) {
            setGenerateError(formatTelegramLinkError(err));
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (!command) return;
        await navigator.clipboard?.writeText(command);
        setCopied(true);
    };

    return (
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Telegram Access</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Link your Telegram account to your SmartKitchen {role} login
                        </p>
                    </div>
                </div>
                <button
                    onClick={refresh}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Refresh Telegram links"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-5 border-b border-gray-100 dark:border-gray-700 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <label className="block">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                            Default store for Telegram commands
                        </span>
                        <select
                            value={defaultBusinessId}
                            onChange={e => setDefaultBusinessId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                        >
                            <option value="">Ask me each time</option>
                            {accessibleBusinesses.map(business => (
                                <option key={business.id} value={business.id}>{business.name}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        onClick={handleGenerate}
                        disabled={generating || !user}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-50 self-end min-h-[40px]"
                    >
                        <KeyRound className="w-4 h-4" />
                        {generating ? 'Generating' : 'Generate Link Code'}
                    </button>
                </div>

                {linkCode && (
                    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                    Send this in Telegram before {formatTime(linkCode.expiresAt)}
                                </p>
                                <code className="block mt-2 text-lg font-bold text-gray-900 dark:text-white break-all">
                                    {command}
                                </code>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 text-sm font-semibold text-blue-700 dark:text-blue-300"
                            >
                                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>
                )}

                {(generateError || error) && (
                    <div className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        {generateError || error}
                    </div>
                )}
            </div>

            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                Telegram commands use the linked SmartKitchen user, so staff and managers keep their normal store permissions.
            </div>

            {links.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {loading ? 'Loading Telegram links...' : 'No Telegram accounts linked yet.'}
                </div>
            ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {links.map(link => (
                        <div key={link.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-semibold text-sm text-gray-900 dark:text-white">
                                    {link.telegramUsername ? `@${link.telegramUsername}` : 'Telegram user'}
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{shortId(link.telegramUserId)}</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Store: {businessById.get(link.defaultBusinessId || '') || 'Ask each time'} | SmartKitchen user: {shortId(link.supabaseUserId)}
                                </div>
                            </div>
                            <button
                                onClick={async () => { await updateTelegramLinkActive(link.id, !link.isActive); await refresh(); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold self-start md:self-center ${link.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                            >
                                {link.isActive ? 'Enabled' : 'Disabled'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
