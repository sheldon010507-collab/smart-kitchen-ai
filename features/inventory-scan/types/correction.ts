/**
 * Scan Correction Types
 * 
 * Types for tracking user corrections to AI scan results
 * Used for YOLO training data collection
 */

export interface ScanCorrectionItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    confidence: number;
    notes?: string;
    estimation_method?: string;
}

export type CorrectionType =
    | 'quantity_changed'
    | 'item_added'
    | 'item_removed'
    | 'name_changed';

export interface CorrectionEntry {
    type: CorrectionType;
    itemName: string;
    originalValue?: number | string;
    newValue?: number | string;
}

export interface ScanCorrectionRecord {
    id?: string;
    businessId: string;
    imageUrls: string[];
    scanArea?: 'fridge' | 'storage' | 'prep' | 'receipt';
    originalResult: ScanCorrectionItem[];
    correctedResult: ScanCorrectionItem[];
    corrections: CorrectionEntry[];
    createdAt?: string;
    createdBy?: string;
}

// Database row type (snake_case)
export interface ScanCorrectionRow {
    id: string;
    business_id: string;
    image_urls: string[];
    scan_area?: string;
    original_result: ScanCorrectionItem[];
    corrected_result: ScanCorrectionItem[];
    corrections: CorrectionEntry[];
    created_at: string;
    created_by?: string;
}
