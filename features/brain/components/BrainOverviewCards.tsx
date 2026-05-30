import React from 'react';
import { AlertTriangle, Bot, CheckCircle2, Link2, Mic } from 'lucide-react';
import { useAgentActionLog } from '../hooks/useAgentActionLog';
import { useTelegramUserLinks } from '../hooks/useTelegramUserLinks';

export function BrainOverviewCards({ businessIds }: { businessIds?: string[] }) {
    const { logs, loading: logsLoading } = useAgentActionLog({ businessIds, limit: 100 });
    const { links, loading: linksLoading } = useTelegramUserLinks(100);

    const today = new Date().toDateString();
    const todayLogs = logs.filter(log => new Date(log.createdAt).toDateString() === today);
    const failed = logs.filter(log => log.status === 'failed').length;
    const pending = logs.filter(log => log.status === 'requires_confirmation').length;
    const voiceUpdates = logs.filter(log => log.channel === 'telegram' && JSON.stringify(log.input || {}).toLowerCase().includes('audio')).length;

    const cards = [
        { label: 'Today Actions', value: todayLogs.length, icon: Bot, tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
        { label: 'Linked Telegram', value: links.length, icon: Link2, tone: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        { label: 'Pending Confirm', value: pending, icon: AlertTriangle, tone: pending > 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
        { label: 'Failed Actions', value: failed, icon: failed > 0 ? AlertTriangle : CheckCircle2, tone: failed > 0 ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
        { label: 'Voice Updates', value: voiceUpdates, icon: Mic, tone: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    ];

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">AI Brain Overview</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">OpenClaw Telegram activity and linked users</p>
                </div>
                {(logsLoading || linksLoading) && <span className="text-xs text-gray-400">Loading…</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map(card => (
                    <div key={card.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.tone}`}>
                            <card.icon className="w-4 h-4" />
                        </div>
                        <div className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}
