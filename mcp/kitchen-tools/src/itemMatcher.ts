export interface InventoryRow {
  id: string;
  business_id: string;
  name: string;
  category?: string | null;
  location?: string | null;
  quantity_value?: number | null;
  quantity_unit?: string | null;
  unit_cost?: number | null;
  expiry_date?: string | null;
  min_stock_level?: number | null;
}

function scoreItem(itemName: string, candidateName: string): number {
  const query = itemName.trim().toLowerCase();
  const candidate = candidateName.trim().toLowerCase();
  if (query === candidate) return 1;
  if (candidate.includes(query) || query.includes(candidate)) return 0.82;
  const queryTokens = new Set(query.split(/\s+/).filter(Boolean));
  const candidateTokens = new Set(candidate.split(/\s+/).filter(Boolean));
  const overlap = [...queryTokens].filter(token => candidateTokens.has(token)).length;
  return overlap / Math.max(queryTokens.size, candidateTokens.size, 1);
}

export function findBestInventoryMatch(itemName: string, items: InventoryRow[]): {
  match?: InventoryRow;
  score: number;
  alternatives: InventoryRow[];
} {
  const scored = items
    .map(item => ({ item, score: scoreItem(itemName, item.name) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  return {
    match: best && best.score >= 0.7 ? best.item : undefined,
    score: best?.score ?? 0,
    alternatives: scored.filter(row => row.score >= 0.45).slice(0, 5).map(row => row.item),
  };
}
