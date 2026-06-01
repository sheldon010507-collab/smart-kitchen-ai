import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TelegramLinkManager } from '../../../features/brain/components/TelegramLinkManager';
import { createTelegramLinkCode } from '../../../features/brain/services/telegramLinkCodeService';

vi.mock('../../../lib/AuthContext', () => ({
    useAuthContext: () => ({
        user: {
            id: 'user-1',
            user_metadata: { role: 'Staff' },
        },
    }),
}));

vi.mock('../../../lib/BusinessContext', () => ({
    useBusiness: () => ({
        accessibleBusinesses: [
            { id: 'biz-1', name: 'Cloud Cafe' },
            { id: 'biz-2', name: 'Market Bar' },
        ],
        currentBusinessId: 'biz-1',
    }),
}));

vi.mock('../../../features/brain/hooks/useTelegramUserLinks', () => ({
    useTelegramUserLinks: () => ({
        links: [],
        loading: false,
        error: null,
        refresh: vi.fn(),
    }),
}));

vi.mock('../../../features/brain/services/telegramLinkCodeService', () => ({
    createTelegramLinkCode: vi.fn(),
}));

vi.mock('../../../features/brain/services/telegramLinkService', () => {
    return {
        formatTelegramLinkError: (error: any) => error?.message || 'Failed to generate link code',
        updateTelegramLinkActive: vi.fn(),
        updateTelegramLinkDefaultBusiness: vi.fn(),
    };
});

describe('TelegramLinkManager', () => {
    it('generates a Telegram link command for the logged-in SmartKitchen user', async () => {
        vi.mocked(createTelegramLinkCode).mockResolvedValue({
            code: 'SK-123456',
            expiresAt: new Date('2026-05-31T21:00:00Z').toISOString(),
        });

        render(<TelegramLinkManager />);

        fireEvent.click(screen.getByRole('button', { name: /generate link code/i }));

        await waitFor(() => {
            expect(screen.getByText('/link SK-123456')).toBeInTheDocument();
        });

        expect(createTelegramLinkCode).toHaveBeenCalledWith({ defaultBusinessId: 'biz-1' });
        expect(screen.queryByPlaceholderText(/telegram user id/i)).not.toBeInTheDocument();
        expect(screen.getByText(/one telegram bot, 2 stores/i)).toBeInTheDocument();
        expect(screen.getByText(/staff and managers keep their normal store permissions/i)).toBeInTheDocument();
    });
});
