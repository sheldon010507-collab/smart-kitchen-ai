import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

import { createTelegramLinkCode } from '../../../features/brain/services/telegramLinkCodeService';

describe('telegram link code service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a short lived link code through the database RPC', async () => {
    mockRpc.mockResolvedValue({
      data: {
        code: 'SK-482913',
        expires_at: '2026-05-31T21:15:00.000Z',
      },
      error: null,
    });

    const result = await createTelegramLinkCode({ defaultBusinessId: 'biz-1' });

    expect(mockRpc).toHaveBeenCalledWith('create_telegram_link_code', {
      p_default_business_id: 'biz-1',
    });
    expect(result).toEqual({
      code: 'SK-482913',
      expiresAt: '2026-05-31T21:15:00.000Z',
    });
  });

  it('surfaces RPC errors without creating a manual telegram link', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'default business is not accessible' },
    });

    await expect(createTelegramLinkCode({ defaultBusinessId: 'biz-2' }))
      .rejects
      .toThrow('default business is not accessible');
  });
});
