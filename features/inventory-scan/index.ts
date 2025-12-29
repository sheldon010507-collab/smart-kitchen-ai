/**
 * Inventory Scan Feature - Barrel Export (Optimized)
 */

// Types
export * from './types';
export type { RecognizedItem, ScanResult, ScanOptions } from './services/optimizedVisionService';
export type { ScanAreaType, KnownItem, PromptOptions } from './services/promptTemplates';

// Utils
export { preprocessImage, preprocessImages, splitImageIntoGrid } from './utils/imagePreprocessing';
export { calculateRequirements, formatRequirements, sortShoppingListByPriority, sortPrepListByConsumption } from './utils/calculateRequirements';

// Services
export { scanInventoryOptimized } from './services/optimizedVisionService';
export { generateScanPrompt, generateQuickScanPrompt, validateAndParseScanResult } from './services/promptTemplates';
export type { ScanResultItem, ScanResult as ParsedScanResult } from './services/promptTemplates';
export { getFromCache, setCache, clearScanCache, calculateImageFingerprint } from './services/scanCache';

// Hooks
export { useOptimizedScan } from './hooks/useOptimizedScan';

// Components
export { default as InventoryScanFlow } from './components/InventoryScanFlow';
export { default as MultiPhotoCapture } from './components/MultiPhotoCapture';
export { default as ScanProgress, MiniProgress } from './components/ScanProgress';
export { default as ConfidenceBadge, ConfidenceDot, EstimationMethodBadge } from './components/ConfidenceBadge';

// Feature flag
export const FEATURE_INVENTORY_SCAN_ENABLED = true;
