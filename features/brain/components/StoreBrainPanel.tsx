import React from 'react';
import { useBusiness } from '../../../lib/BusinessContext';
import { BrainActivityFeed } from './BrainActivityFeed';
import { BrainOverviewCards } from './BrainOverviewCards';
import { TelegramLinkManager } from './TelegramLinkManager';

export function StoreBrainPanel() {
    const { currentBusinessId, activeBusiness } = useBusiness();
    const businessIds = currentBusinessId ? [currentBusinessId] : undefined;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kitchen Brain</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    OpenClaw Telegram voice/text automation for {activeBusiness?.name || 'this store'}.
                </p>
            </div>
            <BrainOverviewCards businessIds={businessIds} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <BrainActivityFeed businessIds={businessIds} title="Store AI Brain Activity" limit={12} />
                <TelegramLinkManager />
            </div>
        </div>
    );
}
