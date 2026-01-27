/**
 * SmartKitchen - TypeScript Type Definitions
 * 
 * These types match the Supabase database schema.
 * Updated: 2025-01-01
 */

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  joinCode: string;
  address?: string;
  hours?: string;
  contactInfo?: string;
  notes?: string;
  customCategories: string[];
  customLocations: string[];
  pendingStaffIds: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Manager' | 'Staff';
  ownedBusinessIds?: string[];
  workingBusinessId?: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  role: 'owner' | 'staff';
  status: 'active' | 'pending';
  createdAt: string;
}

// ============================================================
// CONTAINER MODULE (容器註冊)
// ============================================================

export type FillLevel = 'full' | 'medium' | 'low' | 'empty';
export type CapacityUnit = 'L' | 'kg' | 'pcs' | 'ml' | 'g';

export interface Container {
  id: string;
  businessId: string;
  name: string;
  capacityValue: number;
  capacityUnit: CapacityUnit;
  images: string[];  // URLs to container photos (1-3)
  visualFeatures?: Record<string, any>;  // AI-extracted features
  createdAt: string;
  updatedAt: string;
}

export interface CreateContainerInput {
  businessId: string;
  name: string;
  capacityValue: number;
  capacityUnit: CapacityUnit;
  images?: string[];
}

// ============================================================
// INVENTORY MODULE
// ============================================================

export interface InventoryItem {
  id: string;
  businessId: string;
  name: string;
  quantity: string;
  quantityValue?: number;
  quantityUnit?: string;
  unitCost?: number;
  category: string;
  location: string;
  expiryDate: string;
  addedDate: string;
  minStockLevel?: number;  // 最低庫存線，低於此值自動加入購物清單
  supplier?: string;       // 供應商
  notes?: string;          // 備註
  // Container linking (for unit consistency)
  containerId?: string;    // 綁定的容器 ID
  containerName?: string;  // 容器名稱 (from join)
  fillLevel?: FillLevel;   // 填充度
}

/** SKU Master - for AI recognition */
export interface SkuMaster {
  id: string;
  businessId: string;
  skuCode: string;
  name: string;
  type: 'raw' | 'prep';
  category?: string;
  unit: string;
  imageUrl?: string;
  safetyStock?: number;
  parLevel?: number;
  parentSkuId?: string;
  usagePerUnit?: number;
  typicalPackageSize?: string;
  visualDescription?: string;
  aliases?: string[];
  createdAt: string;
  updatedAt: string;
}

/** Inventory State - real-time stock from scanning */
export interface InventoryState {
  id: string;
  businessId: string;
  skuId: string;
  currentQty: number;
  lastScannedAt?: string;
  scannedBy?: string;
  scanImageUrl?: string;
  confidenceScore?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// WASTAGE TRACKING
// ============================================================

/** Wastage reason types */
export type WastageReason = 'expired' | 'damaged' | 'spoiled' | 'preparation' | 'other';

/** Wastage record - for tracking losses */
export interface WastageRecord {
  id: string;
  businessId: string;
  inventoryItemId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  reason: WastageReason;
  notes?: string;
  expiryDate?: string;
  daysPastExpiry?: number;
  category?: string;
  recordedBy?: string;
  recordedAt: string;
}

// ============================================================
// MENU MODULE (NEW - matches database)
// ============================================================

export interface MenuItem {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  sellingPrice: number;
  estimatedCost?: number;
  category?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Menu Ingredient - BOM (Bill of Materials) */
export interface MenuIngredient {
  id: string;
  menuItemId: string;
  inventoryId?: string;  // References 'inventory' table, NOT 'inventory_items'
  ingredientName: string;
  quantityUsed: number;
  unitUsed: string;
  costPerUnit?: number;
  createdAt: string;
}

// Legacy type for backwards compatibility
export interface IngredientUsage {
  inventoryItemId: string;
  quantityUsed: number;
  unitUsed: string;
  costSnapshot: number;
}

// ============================================================
// OPERATIONS MODULE (NEW - matches database)
// ============================================================

/** Prep Task - daily preparation tasks */
export interface PrepTask {
  id: string;
  businessId: string;
  taskText: string;
  assignedTo?: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  taskDate: string;
  priority: number;
  createdBy?: string;
  createdAt: string;
}

/** Prep Task Inventory Impact - tracks inventory deductions when prep tasks are completed */
export interface PrepTaskInventoryImpact {
  id: string;
  prepTaskId: string;
  inventoryItemId: string;
  quantityUsed: number;
  unit: string;
  recordedAt: string;
}


/** Shift - staff scheduling and clock-in/out */
export interface Shift {
  id: string;
  businessId: string;
  userId: string;
  shiftDate: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  hourlyRate?: number;
  totalHours?: number;
  totalCost?: number;
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}




// ============================================================
// STAFF MODULE
// ============================================================

export interface Staff {
  id: string;
  businessId: string;
  name: string;
  email: string;
  role: 'Chef' | 'Server' | 'Manager' | 'Barista';
  hourlyRate: number;
  status: 'Active' | 'Pending';
}

// ============================================================
// SHOPPING LIST MODULE
// ============================================================

export type ShoppingListReason = 'low_stock' | 'expiring' | 'prep_required' | 'manual';
export type ShoppingListPriority = 'urgent' | 'normal' | 'low';
export type ShoppingListStatus = 'pending' | 'purchased' | 'cancelled';

export interface ShoppingListItem {
  id: string;
  businessId: string;
  inventoryItemId?: string;
  itemName: string;
  category?: string;
  quantityNeeded: number;
  unit: string;
  estimatedCost?: number;
  reason: ShoppingListReason;
  priority: ShoppingListPriority;
  status: ShoppingListStatus;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  purchasedAt?: string;
  notes?: string;
}

// ============================================================
// AI & SCANNING
// ============================================================

/** Scan History Record - persisted scan records (renamed from ScanHistory for clarity) */
export interface ScanHistoryRecord {
  id: string;
  businessId: string;
  scanType: 'front' | 'back' | 'storage';
  imageUrl?: string;
  recognizedItems: any;
  createdAt: string;
  scannedBy?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cookTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: string[];
  instructions: string[];
  missingIngredients: string[];
  calories?: number;
}

// ============================================================
// UI STATE
// ============================================================

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  SCANNER = 'SCANNER',
  CHEF = 'CHEF',
  SHOPPING = 'SHOPPING',
  RESTAURANT = 'RESTAURANT',
  PRIVACY = 'PRIVACY',
  INVENTORY_SCAN = 'INVENTORY_SCAN',
  SUBSCRIPTION = 'SUBSCRIPTION',
  TEMPLATE_MANAGER = 'TEMPLATE_MANAGER'
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

// ============================================================
// DATABASE ROW TYPES (snake_case - direct from Supabase)
// ============================================================

export namespace Database {
  export interface MenuItemRow {
    id: string;
    business_id: string;
    name: string;
    description: string | null;
    selling_price: number;
    estimated_cost: number | null;
    category: string | null;
    image_url: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }

  export interface PrepTaskRow {
    id: string;
    business_id: string;
    task_text: string;
    assigned_to: string | null;
    completed: boolean;
    completed_at: string | null;
    completed_by: string | null;
    task_date: string;
    priority: number;
    created_by: string | null;
    created_at: string;
  }

  export interface ShiftRow {
    id: string;
    business_id: string;
    user_id: string;
    shift_date: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    actual_start: string | null;
    actual_end: string | null;
    hourly_rate: number | null;
    total_hours: number | null;
    total_cost: number | null;
    notes: string | null;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    created_at: string;
  }


}
