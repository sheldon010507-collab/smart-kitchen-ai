/**
 * Scan Cache - Local caching for scan results
 * 
 * Uses image fingerprinting to avoid duplicate API calls
 */

import { ScanResult } from './optimizedVisionService';

interface CacheEntry {
    fingerprint: string;
    result: ScanResult;
    timestamp: number;
    ttl: number;
}

const CACHE_KEY = 'smartkitchen_scan_cache';
const DEFAULT_TTL = 5 * 60 * 1000;  // 5 minutes
const MAX_CACHE_ENTRIES = 50;

/**
 * Calculate image fingerprint for cache key
 */
export async function calculateImageFingerprint(imageData: string): Promise<string> {
    try {
        // Use SubtleCrypto to calculate SHA-256
        const encoder = new TextEncoder();
        // Only use first 10KB for speed
        const data = encoder.encode(imageData.slice(0, 10000));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    } catch (e) {
        // Fallback: simple string hash
        let hash = 0;
        const str = imageData.slice(0, 10000);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).slice(0, 16);
    }
}

/**
 * Get cached result
 */
export function getFromCache(fingerprint: string): ScanResult | null {
    try {
        const cacheStr = localStorage.getItem(CACHE_KEY);
        if (!cacheStr) return null;

        const cache: Record<string, CacheEntry> = JSON.parse(cacheStr);
        const entry = cache[fingerprint];

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            delete cache[fingerprint];
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            return null;
        }

        return entry.result;
    } catch (e) {
        console.warn('Cache read error:', e);
        return null;
    }
}

/**
 * Set cache entry
 */
export function setCache(
    fingerprint: string,
    result: ScanResult,
    ttl: number = DEFAULT_TTL
): void {
    try {
        const cacheStr = localStorage.getItem(CACHE_KEY);
        const cache: Record<string, CacheEntry> = cacheStr ? JSON.parse(cacheStr) : {};

        // Limit cache size
        const keys = Object.keys(cache);
        if (keys.length >= MAX_CACHE_ENTRIES) {
            // Delete oldest 10 entries
            keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
            keys.slice(0, 10).forEach(k => delete cache[k]);
        }

        cache[fingerprint] = {
            fingerprint,
            result,
            timestamp: Date.now(),
            ttl
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Cache write error:', e);
        // Cache failure doesn't affect main flow
    }
}

/**
 * Clear all scan cache
 */
export function clearScanCache(): void {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch (e) {
        console.warn('Cache clear error:', e);
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number; sizeKB: number } {
    try {
        const cacheStr = localStorage.getItem(CACHE_KEY);
        if (!cacheStr) return { entries: 0, sizeKB: 0 };

        const cache = JSON.parse(cacheStr);
        return {
            entries: Object.keys(cache).length,
            sizeKB: Math.round(cacheStr.length / 1024)
        };
    } catch (e) {
        return { entries: 0, sizeKB: 0 };
    }
}
