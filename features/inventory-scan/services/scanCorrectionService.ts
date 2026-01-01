/**
 * Scan Correction Service
 * 
 * Handles saving user corrections to AI scan results
 * Used for collecting YOLO training data
 */

import { supabase } from '../../../lib/supabase';
import {
    ScanCorrectionItem,
    ScanCorrectionRecord,
    CorrectionEntry
} from '../types/correction';

/**
 * Calculate corrections by comparing original and corrected lists
 */
function calculateCorrections(
    original: ScanCorrectionItem[],
    corrected: ScanCorrectionItem[]
): CorrectionEntry[] {
    const corrections: CorrectionEntry[] = [];

    // Map for faster lookup
    const originalMap = new Map(original.map(item => [item.id, item]));
    const correctedMap = new Map(corrected.map(item => [item.id, item]));

    // Check for quantity changes and removals
    original.forEach(orig => {
        const match = correctedMap.get(orig.id) ||
            corrected.find(c => c.name.toLowerCase() === orig.name.toLowerCase());

        if (!match) {
            // Item was removed
            corrections.push({
                type: 'item_removed',
                itemName: orig.name,
                originalValue: orig.quantity,
            });
        } else if (match.quantity !== orig.quantity) {
            // Quantity was changed
            corrections.push({
                type: 'quantity_changed',
                itemName: orig.name,
                originalValue: orig.quantity,
                newValue: match.quantity,
            });
        } else if (match.name !== orig.name) {
            // Name was corrected
            corrections.push({
                type: 'name_changed',
                itemName: orig.name,
                originalValue: orig.name,
                newValue: match.name,
            });
        }
    });

    // Check for additions
    corrected.forEach(corr => {
        const match = originalMap.get(corr.id) ||
            original.find(o => o.name.toLowerCase() === corr.name.toLowerCase());

        if (!match) {
            // Item was manually added
            corrections.push({
                type: 'item_added',
                itemName: corr.name,
                newValue: corr.quantity,
            });
        }
    });

    return corrections;
}

/**
 * Save scan correction data
 * 
 * NOTE: Failure should NOT block the inventory update flow
 * This is supplementary data collection for future model training
 * 
 * @param businessId - Business ID
 * @param imageUrls - URLs/base64 of scanned images
 * @param originalItems - AI's original recognition results
 * @param correctedItems - User's corrected results
 * @param scanArea - Type of scan area
 * @param userId - User who made corrections
 */
export async function saveScanCorrection(
    businessId: string,
    imageUrls: string[],
    originalItems: ScanCorrectionItem[],
    correctedItems: ScanCorrectionItem[],
    scanArea?: string,
    userId?: string
): Promise<{ success: boolean; error?: string; correctionCount?: number }> {
    try {
        const corrections = calculateCorrections(originalItems, correctedItems);

        // No corrections = no need to save
        if (corrections.length === 0) {
            console.log('[ScanCorrection] No corrections to save');
            return { success: true, correctionCount: 0 };
        }

        const { error } = await supabase.from('scan_corrections').insert({
            business_id: businessId,
            image_urls: imageUrls,
            scan_area: scanArea,
            original_result: originalItems,
            corrected_result: correctedItems,
            corrections,
            created_by: userId,
        });

        if (error) throw error;

        console.log(`[ScanCorrection] Saved ${corrections.length} corrections for ${correctedItems.length} items`);
        return { success: true, correctionCount: corrections.length };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[ScanCorrection] Save failed:', message);
        // Return error but don't throw - this should not block inventory updates
        return { success: false, error: message };
    }
}

/**
 * Get correction stats for a business
 */
export async function getCorrectionStats(businessId: string): Promise<{
    totalScans: number;
    scansWithCorrections: number;
    totalCorrections: number;
    lastScanAt: string | null;
} | null> {
    try {
        const { data, error } = await supabase
            .from('scan_correction_stats')
            .select('*')
            .eq('business_id', businessId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No data
            throw error;
        }

        return {
            totalScans: data.total_scans,
            scansWithCorrections: data.scans_with_corrections,
            totalCorrections: data.total_corrections,
            lastScanAt: data.last_scan_at,
        };
    } catch (err) {
        console.error('[ScanCorrection] Stats fetch failed:', err);
        return null;
    }
}

/**
 * Export corrections as training data (for YOLO)
 */
export async function exportCorrectionsForTraining(
    businessId: string,
    limit: number = 100
): Promise<ScanCorrectionRecord[]> {
    try {
        const { data, error } = await supabase
            .from('scan_corrections')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map(row => ({
            id: row.id,
            businessId: row.business_id,
            imageUrls: row.image_urls,
            scanArea: row.scan_area,
            originalResult: row.original_result,
            correctedResult: row.corrected_result,
            corrections: row.corrections,
            createdAt: row.created_at,
            createdBy: row.created_by,
        }));
    } catch (err) {
        console.error('[ScanCorrection] Export failed:', err);
        return [];
    }
}
