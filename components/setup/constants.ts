/**
 * System Template IDs
 */
export const SYSTEM_TEMPLATE_IDS = [
    'a0000000-0000-0000-0000-000000000001', // Chinese Restaurant
    'a0000000-0000-0000-0000-000000000002', // Cafe
    'a0000000-0000-0000-0000-000000000003', // Bakery
    'a0000000-0000-0000-0000-000000000004', // Convenience Store
    'a0000000-0000-0000-0000-000000000005', // Hotpot
] as const;

export type SystemTemplateId = typeof SYSTEM_TEMPLATE_IDS[number];

/**
 * Check if a template is a system template
 */
export const isSystemTemplate = (templateId: string): boolean => {
    return SYSTEM_TEMPLATE_IDS.includes(templateId as SystemTemplateId);
};

/**
 * UI Strings (English)
 */
export const WIZARD_STRINGS = {
    // Header
    title: 'Inventory Setup Wizard',
    close: 'Close',

    // Steps
    step1: 'Import',
    step3: 'Clean',
    step4: 'Confirm',

    // Stage 1
    selectMethod: 'Select Import Method',
    excelImport: 'Excel/CSV',
    excelDesc: 'Upload spreadsheet file',
    useTemplate: 'Use Template',
    templateDesc: 'Select preset template',
    photoScan: 'Photo Scan',
    photoDesc: 'AI recognizes items from photos',

    systemTemplates: 'System Templates',
    myTemplates: 'My Templates',
    noCustomTemplates: 'No custom templates yet. Complete setup to save as template.',

    // Photo Scan
    addPhoto: 'Add Photo',
    takePhoto: 'Take Photo',
    startScan: 'Start AI Scan',
    scanning: 'Analyzing...',
    foundItems: 'items found',
    noPhotos: 'Take photos of your inventory shelves',
    photoLimit: 'Maximum 10 photos',
    removePhoto: 'Remove',

    preview: 'Preview',
    select: 'Select',

    // Scan Mode
    scanMode: 'Scan Mode',
    modeShelf: 'Inventory Shelves',
    modeShelfDesc: 'Physical items on shelves/fridge',
    modeInvoice: 'Invoices / Receipts',
    modeInvoiceDesc: 'Paper documents with costs',


    // Stage 3
    dataClean: 'Data Cleaning',
    itemsToProcess: 'items to process',
    problemItems: 'Problem Items',
    batchEdit: 'Batch Edit',
    itemList: 'Item List',

    duplicateWarning: 'may be duplicate of',
    missingCategory: 'Missing category',
    invalidUnit: 'Invalid unit format',

    merge: 'Merge',
    keepBoth: 'Keep Both',
    delete: 'Delete',
    autoFix: 'Auto Fix',
    keepOriginal: 'Keep Original',

    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    setCategory: 'Set Category',
    setLocation: 'Set Location',
    deleteSelected: 'Delete Selected',

    // Stage 4
    confirmImport: 'Confirm Import',
    readyToImport: 'Ready to Import',
    items: 'items',
    categories: 'categories',
    locations: 'locations',

    existingItems: 'You currently have',
    existingItemsLabel: 'inventory items',

    mergeStrategy: 'Merge Strategy',
    smartMerge: 'Smart Merge',
    smartMergeDesc: 'Same name: update settings | New items: add',
    addNewOnly: 'Add New Only',
    addNewOnlyDesc: 'Skip items with existing names',
    overwrite: 'Overwrite',
    overwriteDesc: 'Delete all existing items, rebuild from import',
    overwriteWarning: '⚠️ Danger: This will delete all existing inventory',

    saveAsTemplate: 'Save as Template',
    saveAsTemplateDesc: 'Save this configuration for quick reuse',

    // Buttons
    cancel: 'Cancel',
    back: 'Back',
    next: 'Next',
    confirm: 'Confirm Import',

    // Stage 3.1 Locations
    setupLocations: 'Setup Storage Locations',
    setupLocationsDesc: 'Define where you store your items (e.g., Main Fridge, Walk-in, Dry Storage)',

    // Save Template Modal
    templateName: 'Template Name',
    templateDescription: 'Description',
    templateIcon: 'Icon',
    saveTemplate: 'Save Template',
    // Stage 3 Batch Edit
    setUnit: 'Set Unit',
    setParLevel: 'Set Par Level',
    setSupplier: 'Set Supplier',
    parLevel: 'Par Level',
    supplier: 'Supplier',

    // Errors
    errorLoading: 'Error loading templates',
    errorImport: 'Import failed',
    errorSaveTemplate: 'Failed to save template',
} as const;

/**
 * Icon options for custom templates
 */
export const TEMPLATE_ICONS = [
    '📦', '🍴', '🍜', '☕', '🥐', '🍲', '🏪', '🍕', '🍣', '🥗',
    '🍔', '🌮', '🍱', '🥘', '🍝', '🥪', '🍰', '🧁', '🍩', '🥤',
];

/**
 * Default locations by type
 */
export const DEFAULT_LOCATIONS = [
    { name: 'Walk-in Fridge', type: 'Fridge' as const },
    { name: 'Freezer', type: 'Freezer' as const },
    { name: 'Dry Storage', type: 'Dry' as const },
    { name: 'Kitchen Line', type: 'Dry' as const },
];

/**
 * Location Types
 */
export const LOCATION_TYPES = ['Fridge', 'Freezer', 'Dry', 'Walk-in', 'Other'] as const;

/**
 * Unit options for batch editing
 */
export const UNIT_OPTIONS = ['kg', 'g', 'L', 'ml', 'pcs', 'box', 'pack', 'dozen', 'bottle', 'can'] as const;

/**
 * Column aliases for Excel import (maps various column names to standard fields)
 */
export const COLUMN_ALIASES: Record<string, string[]> = {
    name: ['name', 'item', 'item name', 'product', '品名', '名稱'],
    category: ['category', 'type', 'group', '分類', '類別'],
    quantityUnit: ['unit', 'qty unit', 'quantity unit', '單位'],
    unitCost: ['cost', 'unit cost', 'price', 'unit price', '單價', '成本'],
    location: ['location', 'storage', 'place', '位置', '存放'],
    minStockLevel: ['par', 'par level', 'min stock', 'reorder level', 'min', '最低庫存', '安全庫存'],
    supplier: ['supplier', 'vendor', '供應商'],
};

/**
 * Unit normalization map
 */
export const UNIT_NORMALIZATION: Record<string, string> = {
    // Weight
    'kilogram': 'kg',
    'kilograms': 'kg',
    'kilo': 'kg',
    'gram': 'g',
    'grams': 'g',
    'pound': 'lb',
    'pounds': 'lb',
    'ounce': 'oz',
    'ounces': 'oz',
    // Volume
    'liter': 'L',
    'liters': 'L',
    'litre': 'L',
    'litres': 'L',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'gallon': 'gal',
    'gallons': 'gal',
    // Count
    'piece': 'pcs',
    'pieces': 'pcs',
    'each': 'pcs',
    'unit': 'pcs',
    'units': 'pcs',
    'item': 'pcs',
    'items': 'pcs',
    // Package
    'package': 'pack',
    'packages': 'pack',
    'packet': 'pack',
    'packets': 'pack',
    'box': 'box',
    'boxes': 'box',
    'case': 'case',
    'cases': 'case',
    'bottle': 'bottle',
    'bottles': 'bottle',
    'can': 'can',
    'cans': 'can',
    'bag': 'bag',
    'bags': 'bag',
    // Chinese
    '千克': 'kg',
    '公斤': 'kg',
    '克': 'g',
    '升': 'L',
    '毫升': 'ml',
    '個': 'pcs',
    '件': 'pcs',
    '包': 'pack',
    '盒': 'box',
    '箱': 'case',
    '瓶': 'bottle',
    '袋': 'bag',
};

/**
 * LocalStorage key for wizard draft
 */
export const WIZARD_DRAFT_KEY = (businessId: string) => `inventory_setup_draft_${businessId}`;
