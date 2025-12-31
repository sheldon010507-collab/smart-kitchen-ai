/**
 * Storage Utilities
 * 
 * Handles browser storage cleanup and migration for business IDs
 */

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Sanitize storage to clean up legacy business ID formats
 * Migrates valid UUIDs from localStorage to sessionStorage
 * Removes invalid formats (e.g., biz_... prefixes)
 */
export const sanitizeStorage = () => {
    if (typeof window === 'undefined') return;

    const keysToCheck = ['active_business_id', 'selectedBusinessId', 'currentBusinessId'];

    keysToCheck.forEach(key => {
        // Check localStorage
        const valLocal = localStorage.getItem(key);
        if (valLocal) {
            localStorage.removeItem(key); // Clean from local
            if (uuidRegex.test(valLocal) && !valLocal.startsWith('biz_')) {
                sessionStorage.setItem(key, valLocal); // Move to session if valid
            }
        }

        // Check sessionStorage
        const valSession = sessionStorage.getItem(key);
        if (valSession) {
            if (valSession.startsWith('biz_') || !uuidRegex.test(valSession)) {
                sessionStorage.removeItem(key);
            }
        }
    });
};
