import type { BusinessSelectionInput, ResolvedActor, ResolvedBusiness, ToolResult } from './types.js';
import { resolveActor } from './identity.js';

function normalizeName(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/[^\p{Letter}\p{Number}\s]/gu, '').replace(/\s+/g, ' ');
}

export async function resolveBusiness(input: BusinessSelectionInput): Promise<ToolResult<{ actor: ResolvedActor; business: ResolvedBusiness }>> {
  const actor = await resolveActor(input);

  if (!actor.linked || !actor.supabase_user_id) {
    return { ok: false, error: actor.error || 'Telegram account is not linked to Smart Kitchen' };
  }

  if (actor.accessible_businesses.length === 0) {
    return { ok: false, error: 'No active Smart Kitchen stores are available for this user' };
  }

  if (input.business_id) {
    const business = actor.accessible_businesses.find(candidate => candidate.business_id === input.business_id);
    if (!business) return { ok: false, error: 'You do not have access to the requested store' };
    return { ok: true, data: { actor, business } };
  }

  if (input.business_name) {
    const target = normalizeName(input.business_name);
    const exact = actor.accessible_businesses.find(candidate => normalizeName(candidate.name) === target);
    const fuzzy = exact || actor.accessible_businesses.find(candidate => normalizeName(candidate.name).includes(target) || target.includes(normalizeName(candidate.name)));
    if (fuzzy) return { ok: true, data: { actor, business: fuzzy } };
  }

  if (actor.default_business_id) {
    const business = actor.accessible_businesses.find(candidate => candidate.business_id === actor.default_business_id);
    if (business) return { ok: true, data: { actor, business } };
  }

  if (actor.accessible_businesses.length === 1) {
    return { ok: true, data: { actor, business: actor.accessible_businesses[0] } };
  }

  return {
    ok: false,
    clarification: `Which store should I use? Options: ${actor.accessible_businesses.map(business => business.name).join(', ')}`,
  };
}
