import { describe, expect, it, vi } from 'vitest';

import { redeemTelegramLinkCode } from '../../mcp/kitchen-tools/src/linkCodes';

function createQueryBuilder(response: unknown) {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(response)),
  };
  return builder;
}

describe('redeemTelegramLinkCode', () => {
  it('redeems a valid code into an active telegram_user_links row', async () => {
    const linkCode = {
      id: 'code-1',
      code: 'SK-482913',
      supabase_user_id: 'user-1',
      default_business_id: 'biz-1',
      expires_at: '2026-05-31T21:15:00.000Z',
      used_at: null,
    };
    const linkCodeBuilder = createQueryBuilder({ data: linkCode, error: null });
    const linkBuilder = createQueryBuilder({ data: null, error: null });

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'telegram_link_codes') return linkCodeBuilder;
        if (table === 'telegram_user_links') return linkBuilder;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await redeemTelegramLinkCode(db as any, {
      telegram_user_id: '123456',
      telegram_username: 'chefwendy',
      code: 'sk-482913',
      now: new Date('2026-05-31T21:00:00.000Z'),
    });

    expect(result).toEqual({
      ok: true,
      data: {
        supabase_user_id: 'user-1',
        default_business_id: 'biz-1',
      },
    });
    expect(linkBuilder.upsert).toHaveBeenCalledWith({
      telegram_user_id: '123456',
      telegram_username: 'chefwendy',
      supabase_user_id: 'user-1',
      default_business_id: 'biz-1',
      is_active: true,
    }, { onConflict: 'telegram_user_id' });
    expect(linkCodeBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      used_at: expect.any(String),
      telegram_user_id: '123456',
    }));
  });

  it('rejects expired or already used codes', async () => {
    const expiredCode = {
      id: 'code-2',
      code: 'SK-111111',
      supabase_user_id: 'user-1',
      default_business_id: null,
      expires_at: '2026-05-31T20:59:00.000Z',
      used_at: null,
    };
    const linkCodeBuilder = createQueryBuilder({ data: expiredCode, error: null });
    const db = { from: vi.fn(() => linkCodeBuilder) };

    const result = await redeemTelegramLinkCode(db as any, {
      telegram_user_id: '123456',
      code: 'SK-111111',
      now: new Date('2026-05-31T21:00:00.000Z'),
    });

    expect(result).toEqual({
      ok: false,
      error: 'Link code expired or already used',
    });
  });
});
