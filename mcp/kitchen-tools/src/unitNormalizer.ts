const UNIT_ALIASES: Record<string, string> = {
  l: 'L',
  litre: 'L',
  liter: 'L',
  litres: 'L',
  liters: 'L',
  ml: 'ml',
  millilitre: 'ml',
  milliliter: 'ml',
  millilitres: 'ml',
  milliliters: 'ml',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  g: 'g',
  gram: 'g',
  grams: 'g',
  pcs: 'pcs',
  pc: 'pcs',
  piece: 'pcs',
  pieces: 'pcs',
  unit: 'pcs',
  units: 'pcs',
  bottle: 'pcs',
  bottles: 'pcs',
  box: 'pcs',
  boxes: 'pcs',
};

export function normalizeUnit(unit: string | undefined | null): string {
  if (!unit) return 'pcs';
  const key = unit.trim().toLowerCase();
  return UNIT_ALIASES[key] || unit.trim();
}
