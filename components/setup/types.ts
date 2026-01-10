/**
 * Inventory Setup Wizard - Type Definitions
 */

// ============================================================
// Template Types
// ============================================================

export interface TemplateCategory {
    name: string;
    parent?: string;  // For future subcategories
}

export interface TemplateLocation {
    name: string;
    type: 'Fridge' | 'Freezer' | 'Dry' | 'Walk-in' | 'Other';
}

export interface TemplateItem {
    name: string;
    category: string;
    unit: string;
    suggestedPar?: number;
    cost?: number;
}


/**
 * Full template structure (frontend, camelCase)
 */
export interface InventoryTemplate {
    id: string;
    ownerId?: string;
    businessId?: string;

    // Basic info
    name: string;
    nameZh?: string;
    description?: string;
    icon: string;
    industry?: string;

    // Template content
    categories: TemplateCategory[];
    locations: TemplateLocation[];
    items: TemplateItem[];

    // Metadata
    isSystem: boolean;
    usageCount: number;

    createdAt: string;
    updatedAt: string;
}

/**
 * Database row type (snake_case)
 */
export interface InventoryTemplateRow {
    id: string;
    owner_id: string | null;
    business_id: string | null;
    name: string;
    name_zh: string | null;
    description: string | null;
    icon: string;
    industry: string | null;
    categories: TemplateCategory[];
    locations: TemplateLocation[];
    items: TemplateItem[];
    is_system: boolean;
    usage_count: number;
    created_at: string;
    updated_at: string;
}

/** Template source type */
export type TemplateSource = 'system' | 'user';

// ============================================================
// Wizard Types
// ============================================================

export interface ValidationIssue {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}

export interface DraftInventoryItem {
    id: string;                    // Temp UUID
    name: string;
    category: string;
    location?: string;

    // 新字段 (與 InventoryItem 對齊)
    quantityUnit?: string;
    unitCost?: number;
    minStockLevel?: number;        // Par Level
    supplier?: string;
    notes?: string;

    // @deprecated - 向後兼容，將在遷移後移除
    unit?: string;
    cost?: number;
    suggestedPar?: number;

    // Validation state
    issues?: ValidationIssue[];
    isDuplicate?: boolean;
    isDeleted?: boolean;           // Soft delete flag
}

/** Draft Location (Stage 3.1) */
export interface DraftLocation {
    id: string;                    // Temp UUID
    name: string;
    type: 'Fridge' | 'Freezer' | 'Dry' | 'Walk-in' | 'Other';
    isNew?: boolean;               // Created in wizard
}

/** Draft Category (Stage 3.2) */
export interface DraftCategory {
    id: string;
    name: string;                  // Flat string "Meat" or "Meat > Pork"
    isNew?: boolean;
}

/** Import method */
export type ImportPath = 'excel' | 'template' | 'photo';

/** Wizard stage
 * 1: Ingest (Import/Photo)
 * 2: Locations (Setup storage areas)
 * 3: Categories (Setup taxonomy)
 * 4: Cleanse (Review items)
 * 5: Commit (Final check)
 * 6: Success
 */
export type WizardStage = 1 | 2 | 3 | 4 | 5 | 6;

/** Merge strategy for importing to existing inventory */
export type MergeStrategy = 'smart-merge' | 'add-new-only' | 'overwrite';

/** Wizard draft for LocalStorage persistence */
export interface WizardDraft {
    businessId: string;
    path: ImportPath;
    templateId?: string;
    currentStage: WizardStage;
    mergeStrategy: MergeStrategy;
    draftItems: DraftInventoryItem[];
    draftLocations: DraftLocation[];
    draftCategories: DraftCategory[];
    lastSavedAt: string;
}

// ============================================================
// Component Props Types
// ============================================================

export interface InventorySetupWizardProps {
    businessId: string;
    userId: string;
    existingCategories: string[];
    existingLocations: string[];
    existingItemCount: number;
    initialTemplate?: InventoryTemplate;
    onClose: () => void;
    onComplete: (items: DraftInventoryItem[], strategy: MergeStrategy) => Promise<void>;
}

export interface TemplateCardProps {
    template: InventoryTemplate;
    source: TemplateSource;
    onSelect: (template: InventoryTemplate) => void;
    onEdit?: (template: InventoryTemplate) => void;
    onDelete?: (template: InventoryTemplate) => void;
    onPreview?: (template: InventoryTemplate) => void;
    isSelected?: boolean;
}

export interface Stage1IngestProps {
    businessId: string;
    userId: string;
    onNext: (items: DraftInventoryItem[], path: ImportPath, templateId?: string) => void;
    onCancel: () => void;
    initialPath?: ImportPath;
    initialTemplateId?: string;
}

export interface Stage3CleanseProps {
    items: DraftInventoryItem[];
    existingCategories: string[];
    existingLocations: string[];
    onNext: (cleanedItems: DraftInventoryItem[]) => void;
    onBack: () => void;
}

export interface Stage3LocationsProps {
    businessId: string;
    locations: DraftLocation[];
    onChange: (locations: DraftLocation[]) => void;
    onNext: () => void;
    onBack: () => void;
}

export interface Stage3CategoriesProps {
    categories: DraftCategory[];
    onChange: (categories: DraftCategory[]) => void;
    onNext: () => void;
    onBack: () => void;
}

export interface Stage4CommitProps {
    items: DraftInventoryItem[];
    existingItemCount: number;
    businessId: string;
    userId: string;
    onCommit: (strategy: MergeStrategy) => Promise<void>;
    onBack: () => void;
    onSaveAsTemplate: () => void;
}
