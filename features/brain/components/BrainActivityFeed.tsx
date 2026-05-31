import React from 'react';
import { AlertCircle, Bot, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { useAgentActionLog } from '../hooks/useAgentActionLog';

const statusStyles: Record<string, string> = {
    executed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    failed: 'text-red-700 bg-red-50 border-red-200',
    requires_confirmation: 'text-amber-700 bg-amber-50 border-amber-200',
    started: 'text-blue-700 bg-blue-50 border-blue-200',
    cancelled: 'text-gray-700 bg-gray-50 border-gray-200',
};

function StatusIcon({ status }: { status: string }) {
    if (status === 'executed') return <CheckCircle2 className="w-4 h-4" />;
    if (status === 'failed') return <AlertCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
}

function formatQuantity(value: unknown, unit?: unknown) {
    if (value === undefined || value === null) return '';
    return `${value}${unit ? ` ${unit}` : ''}`;
}

function describeAction(log: any) {
    const output = log.output || {};
    const input = log.input || {};
    const stockUpdate = output.stock_update;
    const item = output.item || stockUpdate?.item;
    const unit = output.unit || stockUpdate?.unit || input.unit;

    if (output.previous_quantity !== undefined && output.new_quantity !== undefined) {
        return `${item?.name || input.item_name || 'Item'}: ${formatQuantity(output.previous_quantity, unit)} -> ${formatQuantity(output.new_quantity, unit)}`;
    }

    if (stockUpdate?.previous_quantity !== undefined && stockUpdate?.new_quantity !== undefined) {
        return `${stockUpdate.item || input.item_name || 'Item'}: ${formatQuantity(stockUpdate.previous_quantity, stockUpdate.unit)} -> ${formatQuantity(stockUpdate.new_quantity, stockUpdate.unit)}`;
    }

    if (output.shopping_item) {
        return `Added shopping item: ${output.shopping_item.item_name} (${formatQuantity(output.shopping_item.quantity_needed, output.shopping_item.unit)})`;
    }

    if (Array.isArray(output.tasks)) {
        return `Created ${output.tasks.length} prep task${output.tasks.length === 1 ? '' : 's'}`;
    }

    if (Array.isArray(output.inventory)) {
        return `Read ${output.inventory.length} inventory item${output.inventory.length === 1 ? '' : 's'}`;
    }

    if (log.status === 'requires_confirmation') {
        return 'Needs confirmation before changing store data';
    }

    return input.item_name ? `Requested: ${input.item_name}` : null;
}

export function BrainActivityFeed({
    businessIds,
    actorUserId,
    title = 'AI Brain Activity',
    limit = 8,
}: {
    businessIds?: string[];
    actorUserId?: string;
    title?: string;
    limit?: number;
}) {
    const { logs, loading, error, refresh } = useAgentActionLog({ businessIds, actorUserId, limit });

    return (
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Real inventory, prep, shopping, and wastage changes from Telegram</p>
                    </div>
                </div>
                <button
                    onClick={refresh}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Refresh AI Brain activity"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error ? (
                <div className="p-5 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300">
                    {error}
                </div>
            ) : logs.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {loading ? 'Loading AI Brain activity...' : 'No AI Brain activity yet.'}
                </div>
            ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {logs.map(log => {
                        const actionDescription = describeAction(log);
                        return (
                            <div key={log.id} className="p-4 flex items-start gap-3">
                                <div className={`mt-0.5 px-2 py-1 rounded-full border ${statusStyles[log.status] || statusStyles.started}`}>
                                    <StatusIcon status={log.status} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-sm text-gray-900 dark:text-white">{log.toolName}</span>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusStyles[log.status] || statusStyles.started}`}>
                                            {log.status.replace('_', ' ')}
                                        </span>
                                        {log.actorRole && <span className="text-[11px] text-gray-500 dark:text-gray-400">{log.actorRole}</span>}
                                    </div>
                                    {actionDescription && (
                                        <p className="text-sm text-gray-700 dark:text-gray-200 mt-2">{actionDescription}</p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {log.senderUsername ? `@${log.senderUsername}` : log.senderId || 'Unknown sender'} | {new Date(log.createdAt).toLocaleString()}
                                    </p>
                                    {log.errorMessage && (
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">{log.errorMessage}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
