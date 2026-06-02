import { describe, expect, it, vi } from 'vitest';

const updateDefaultBusiness = vi.hoisted(() => vi.fn(async () => ({ error: null })));

vi.mock('../../mcp/kitchen-tools/src/supabase', () => {
  const link = {
    telegram_user_id: '123456',
    telegram_username: 'chefwendy',
    supabase_user_id: 'user-1',
    default_business_id: 'biz-1',
    is_active: true,
  };

  const telegramLinkBuilder: any = {
    select: vi.fn(() => telegramLinkBuilder),
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
    eq: vi.fn(() => telegramLinkBuilder),
    maybeSingle: vi.fn(async () => ({ data: link, error: null })),
  };

  const businessesBuilder: any = {
    select: vi.fn(() => businessesBuilder),
    eq: vi.fn(async () => ({
      data: [
        { id: 'biz-1', name: 'Cloud Cafe' },
        { id: 'biz-2', name: 'Market Bar' },
      ],
      error: null,
    })),
  };

  const membersBuilder: any = {
    select: vi.fn(() => membersBuilder),
    eq: vi.fn(() => membersBuilder),
    then: (resolve: any) => resolve({
      data: [
        { business_id: 'biz-3', role: 'staff', businesses: { id: 'biz-3', name: 'Bakery Kiosk' } },
        { business_id: 'biz-4', role: 'owner', businesses: { id: 'biz-4', name: 'Pop Up' } },
      ],
      error: null,
    }),
  };

  const defaultUpdateBuilder = {
    eq: updateDefaultBusiness,
  };

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'telegram_user_links') {
          return {
            ...telegramLinkBuilder,
            update: vi.fn((payload: any) => {
              if ('default_business_id' in payload) return defaultUpdateBuilder;
              return { eq: vi.fn(async () => ({ error: null })) };
            }),
          };
        }
        if (table === 'businesses') return businessesBuilder;
        if (table === 'business_members') return membersBuilder;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

describe('Telegram multi-store identity selection', () => {
  it('lists every store a linked Telegram user can access with the current default marked', async () => {
    const { listAccessibleBusinesses } = await import('../../mcp/kitchen-tools/src/identity');

    const result = await listAccessibleBusinesses({ telegram_user_id: '123456' });

    expect(result).toMatchObject({
      ok: true,
      data: {
        default_business_id: 'biz-1',
        businesses: [
          { business_id: 'biz-1', name: 'Cloud Cafe', access_role: 'owner', is_default: true },
          { business_id: 'biz-2', name: 'Market Bar', access_role: 'owner', is_default: false },
          { business_id: 'biz-3', name: 'Bakery Kiosk', access_role: 'staff', is_default: false },
          { business_id: 'biz-4', name: 'Pop Up', access_role: 'owner', is_default: false },
        ],
      },
    });
  });

  it('treats business_members.owner as manager access for that store only', async () => {
    const { resolveActor } = await import('../../mcp/kitchen-tools/src/identity');

    const actor = await resolveActor({ telegram_user_id: '123456' });

    expect(actor.linked).toBe(true);
    expect(actor.accessible_businesses).toEqual(expect.arrayContaining([
      { business_id: 'biz-3', name: 'Bakery Kiosk', access_role: 'staff' },
      { business_id: 'biz-4', name: 'Pop Up', access_role: 'owner' },
    ]));
  });

  it('sets the Telegram default store by store name after access is verified', async () => {
    const { setDefaultBusiness } = await import('../../mcp/kitchen-tools/src/identity');

    const result = await setDefaultBusiness({
      telegram_user_id: '123456',
      business_name: 'market',
    });

    expect(result).toEqual({
      ok: true,
      data: {
        default_business_id: 'biz-2',
        business_name: 'Market Bar',
      },
    });
    expect(updateDefaultBusiness).toHaveBeenCalledWith('telegram_user_id', '123456');
  });
});
