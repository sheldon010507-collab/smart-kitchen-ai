/**
 * String/Number Formatting Utilities
 * 
 * Centralized formatting functions for consistent data handling
 */

/**
 * Normalize a value to a number, with fallback
 */
export function normalizeNumber(v: any, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.\-]/g, ''));
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Normalize date string to DD/MM/YYYY format
 */
export function normalizeDDMMYYYY(input: string | undefined | null): string {
    const v = (input || '').trim();
    if (!v) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
    const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const iso2 = v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (iso2) return `${iso2[3]}/${iso2[2]}/${iso2[1]}`;
    return v;
}

/**
 * Remove duplicates from string array (trimmed, non-empty)
 */
export function uniq(arr: string[]): string[] {
    return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
}

/**
 * Simple similarity score between two strings
 * Higher score = more similar
 */
export function simpleScore(a: string, b: string): number {
    const A = a.toLowerCase().trim();
    const B = b.toLowerCase().trim();
    if (!A || !B) return 0;
    if (A === B) return 1000;
    if (A.includes(B) || B.includes(A)) return 300;
    let score = 0;
    for (const ch of new Set(A.split(''))) {
        if (B.includes(ch)) score += 2;
    }
    return score;
}

/**
 * Find top matching strings from options based on similarity
 */
export function topMatches(query: string, options: string[], limit = 6): string[] {
    const scored = options
        .map((o) => ({ o, s: simpleScore(query, o) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit)
        .map((x) => x.o);
    return uniq(scored);
}
