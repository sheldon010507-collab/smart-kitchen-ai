import React from 'react';
import { useAuthContext } from '../../../lib/AuthContext';
import { BrainActivityFeed } from './BrainActivityFeed';

export function StaffBrainActivity({ businessId }: { businessId?: string }) {
    const { user } = useAuthContext();
    return (
        <BrainActivityFeed
            businessIds={businessId ? [businessId] : undefined}
            actorUserId={user?.id}
            title="My AI Brain Updates"
            limit={6}
        />
    );
}
