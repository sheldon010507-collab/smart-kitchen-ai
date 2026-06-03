import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clipboard, KeyRound, Link2, RefreshCw } from 'lucide-react';
import { useAuthContext } from '../../../lib/AuthContext';
import { useBusiness } from '../../../lib/BusinessContext';
import { useTelegramUserLinks } from '../hooks/useTelegramUserLinks';
import { createTelegramLinkCode, TelegramLinkCode } from '../services/telegramLinkCodeService';
import { formatTelegramLinkError, updateTelegramLinkActive, updateTelegramLinkDefaultBusiness } from '../services/telegramLinkService';

function shortId(value?: string | null) {
    if (!value) return 'none';
    return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function formatTime(value: string) {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatBusinessRole(business: { name: string; accessRole?: 'Manager' | 'Staff' }) {
    return `${business.name}${business.accessRole ? ` (${business.accessRole})` : ''}`;
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
    const [updatingLinkId, setUpdatingLinkId] = useState<string | null>(null);

    const command = linkCode ? `/link ${linkCode.code}` : '';
    const linkedCount = links.filter(link => link.isActive).length;

    useEffect(() => {
        if (!defaultBusinessId && (currentBusinessId || accessibleBusinesses[0]?.id)) {
            setDefaultBusinessId(currentBusinessId || accessibleBusinesses[0].id);
        }
    }, [accessibleBusinesses, currentBusinessId, defaultBusinessId]);

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

    const handleLinkDefaultChange = async (linkId: string, businessId: string) => {
        setUpdatingLinkId(linkId);
        try {
            await updateTelegramLinkDefaultBusiness(linkId, businessId || null);
            await refresh();
        } catch (err: any) {
            setGenerateError(formatTelegramLinkError(err));
        } finally {
            setUpdatingLinkId(null);
        }
    };

    return (
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white">Telegram</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {loading ? 'Checking link...' : linkedCount > 0 ? `${linkedCount} account${linkedCount === 1 ? '' : 's'} linked` : 'Not linked'}
                        </p>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-[minmax(180px,1fr)_auto_auto] gap-2 lg:ml-4">
                    <select
                        value={defaultBusinessId}
                        onChange={e => setDefaultBusinessId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                        title="Default store for Telegram commands"
                    >
                        <option value="">Ask each time</option>
                        {accessibleBusinesses.map(business => (
                            <option key={business.id} value={business.id}>{formatBusinessRole(business)}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleGenerate}
                        disabled={generating || !user}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-50 min-h-[40px]"
                    >
                        <KeyRound className="w-4 h-4" />
                        {generating ? 'Generating' : 'Generate Link Code'}
                    </button>
                    <button
                        onClick={refresh}
                        className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Refresh Telegram links"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {(linkCode || generateError || error) && (
                <div className="px-4 pb-4">
                    {linkCode && (
                        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                        Send before {formatTime(linkCode.expiresAt)}
                                    </p>
                                    <code className="block mt-1 text-base font-bold text-gray-900 dark:text-white break-all">
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
                        <div className="mt-3 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            {generateError || error}
                        </div>
                    )}
                </div>
            )}

            {links.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                    {links.map(link => (
                        <div key={link.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-semibold text-sm text-gray-900 dark:text-white">
                                    {link.telegramUsername ? `@${link.telegramUsername}` : 'Telegram user'}
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{shortId(link.telegramUserId)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <select
                                    value={link.defaultBusinessId || ''}
                                    onChange={e => handleLinkDefaultChange(link.id, e.target.value)}
                                    disabled={updatingLinkId === link.id}
                                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white min-w-[180px]"
                                    title="Default store for this Telegram account"
                                >
                                    <option value="">Ask each time</option>
                                    {accessibleBusinesses.map(business => (
                                        <option key={business.id} value={business.id}>{formatBusinessRole(business)}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={async () => { await updateTelegramLinkActive(link.id, !link.isActive); await refresh(); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold self-start md:self-center ${link.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                                >
                                    {link.isActive ? 'Enabled' : 'Disabled'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
