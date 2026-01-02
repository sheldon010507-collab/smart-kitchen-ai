/**
 * Inventory Scan Module - Type Definitions
 * 
 * Types for the AI-driven inventory scanning and requirement calculation feature.
 */

// Correction types
export * from './correction';

// ===================
// ENUMS (as union types)
// ===================

/** SKU type: raw material or prepared item */
export type SKUType = 'raw' | 'prep';

/** Scan area type */
export type ScanAreaType = 'front' | 'back' | 'storage';

// ===================
// FRIDGE AUDIT TYPES
// ===================

/**
 * RAG Dictionary item - loaded from inventory for smart matching
 */
export interface DictionaryItem {
    id: string;
    name: string;
    unit: string;
    currentQty: number;
    category?: string;
}

/**
 * Fridge audit result from AI
 */
export interface FridgeAuditResult {
    found: Array<{
        name: string;
        quantity: number;
        unit: string;
        confidence: number;
        notes?: string;
    }>;
    notFound: string[];           // Items in dictionary but not seen
    newItems: Array<{
        name: string;
        quantity: number;
        unit: string;
        confidence: number;
    }>;
    scanQuality: 'good' | 'medium' | 'poor';
}

// ===================
// SKU & INVENTORY INTERFACES
// ===================

/**
 * SKU Master - base item data
 */
export interface SKUMaster {
    id: string;
    business_id: string;
    sku_code: string;
    name: string;
    type: SKUType;
    category: string | null;
    unit: string;
    image_url: string | null;

    // Raw material specific
    safety_stock: number;

    // Prep item specific
    par_level: number;
    parent_sku_id: string | null;
    usage_per_unit: number | null;

    created_at: string;
    updated_at: string;
}

/**
 * Inventory State - real-time stock levels
 */
export interface InventoryState {
    id: string;
    business_id: string;
    sku_id: string;
    current_qty: number;
    last_scanned_at: string | null;
    scanned_by: string | null;
    scan_image_url: string | null;
    confidence_score: number | null;

    // Joined data
    sku?: SKUMaster;
}

/**
 * SKU with current state (for calculations)
 */
export interface SKUWithState extends SKUMaster {
    current_qty: number;
}

// ===================
// AI RECOGNITION INTERFACES
// ===================

/**
 * AI-recognized item from image
 */
export interface RecognizedItem {
    name: string;
    quantity: number;
    unit: string;
    confidence: number;
    bounding_box?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    matched_sku_id?: string;
    notes?: string;
}

/**
 * Scan result from a single scan
 */
export interface ScanResult {
    scan_type: ScanAreaType;
    image_url: string;
    recognized_items: RecognizedItem[];
    timestamp: string;
}

/**
 * Scan history record
 */
export interface ScanHistory {
    id: string;
    business_id: string;
    scan_type: ScanAreaType;
    image_url: string | null;
    recognized_items: RecognizedItem[];
    created_at: string;
    scanned_by: string | null;
}

// ===================
// TASK INTERFACES
// ===================

/**
 * Prep task - items to prepare today
 */
export interface PrepTask {
    action: 'PREP';
    sku_id: string;
    item_name: string;
    quantity: number;
    unit: string;
    parent_raw_name?: string;
    raw_consumption?: number;
}

/**
 * Shopping task - items to buy
 */
export interface ShoppingTask {
    action: 'BUY';
    sku_id: string;
    item_name: string;
    quantity: number;
    unit: string;
    reason: string;
    priority: 'urgent' | 'normal' | 'low';
}

/**
 * Requirement calculation result
 */
export interface RequirementCalculation {
    prep_list: PrepTask[];
    shopping_list: ShoppingTask[];
    summary: {
        total_prep_items: number;
        total_shopping_items: number;
        estimated_prep_time: number; // in minutes
    };
}

// ===================
// UI STATE INTERFACES
// ===================

/**
 * Scan step configuration
 */
export interface ScanStep {
    area: ScanAreaType;
    title: string;
    description: string;
    icon: string;
}

/**
 * Scan state for the hook
 */
export interface ScanState {
    isScanning: boolean;
    currentArea: ScanAreaType | null;
    recognizedItems: RecognizedItem[];
    error: string | null;
}

// ===================
// INPUT TYPES
// ===================

/**
 * Input for creating a new SKU
 */
export interface CreateSKU {
    business_id: string;
    sku_code: string;
    name: string;
    type: SKUType;
    category?: string;
    unit: string;
    image_url?: string;
    safety_stock?: number;
    par_level?: number;
    parent_sku_id?: string;
    usage_per_unit?: number;
}

/**
 * Input for updating inventory state
 */
export interface UpdateInventoryState {
    business_id: string;
    sku_id: string;
    current_qty: number;
    confidence_score?: number;
    scan_image_url?: string;
}
