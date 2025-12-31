/**
 * Date Utility Functions
 * 
 * Extracted from App.tsx for reusability
 */

/**
 * Convert date string to ISO format (YYYY-MM-DD)
 * Handles both 'dd/mm/yyyy' and 'YYYY-MM-DD' formats
 * 
 * @param dateStr - Date string to convert
 * @returns ISO date string or null if invalid
 */
export const toISODate = (dateStr: string | undefined | null): string | null => {
    if (!dateStr) return null;
    const v = dateStr.trim();
    if (!v) return null;

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    // dd/mm/yyyy format
    const match = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
};

/**
 * Format date to display format (dd/mm/yyyy)
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string
 */
export const toDisplayDate = (isoDate: string | null | undefined): string => {
    if (!isoDate) return '';
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const [, year, month, day] = match;
        return `${day}/${month}/${year}`;
    }
    return isoDate;
};

/**
 * Calculate days until a date
 * @param dateStr - Date string in any format
 * @returns Number of days (negative if in past)
 */
export const daysUntil = (dateStr: string | null | undefined): number | null => {
    const iso = toISODate(dateStr);
    if (!iso) return null;
    const target = new Date(iso);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 3600 * 24));
};

/**
 * Check if a date is expiring soon (within N days)
 */
export const isExpiringSoon = (dateStr: string | null | undefined, days: number = 3): boolean => {
    const remaining = daysUntil(dateStr);
    if (remaining === null) return false;
    return remaining >= 0 && remaining <= days;
};

/**
 * Check if a date is expired
 */
export const isExpired = (dateStr: string | null | undefined): boolean => {
    const remaining = daysUntil(dateStr);
    if (remaining === null) return false;
    return remaining < 0;
};
