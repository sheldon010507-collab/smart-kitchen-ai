
export interface Business {
  id: string;
  name: string;
  ownerId: string;
  joinCode: string;
  // New fields
  address?: string;
  hours?: string;
  contactInfo?: string;
  notes?: string;
  
  customCategories: string[];
  customLocations: string[];
  pendingStaffIds: string[]; // List of staff requesting to join
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Manager' | 'Staff';
  ownedBusinessIds?: string[];
  workingBusinessId?: string;
}

export interface InventoryItem {
  id: string;
  businessId: string;
  name: string;
  quantity: string; // Display string, e.g. "5 kg"
  quantityValue?: number; // Numeric value, e.g. 5
  quantityUnit?: string; // Unit, e.g. 'kg', 'g', 'L', 'ml', 'pcs'
  unitCost?: number; // Cost per 1 unit of quantityUnit (e.g. cost per 1 kg)
  category: string;
  location: string;
  expiryDate: string;
  addedDate: string;
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

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  SCANNER = 'SCANNER',
  CHEF = 'CHEF',
  SHOPPING = 'SHOPPING',
  RESTAURANT = 'RESTAURANT',
  PRIVACY = 'PRIVACY'
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface PrepTask {
  id: string;
  businessId: string;
  text: string;
  completed: boolean;
  addedBy: string;
  date: string;
}

export interface SalesItem {
  name: string;
  quantity: number;
  price: number;
}

export interface SalesReceipt {
  id: string;
  businessId: string;
  date: string;
  time: string;
  totalAmount: number;
  items: SalesItem[];
  paymentMethod?: string;
}

export interface Staff {
  id: string;
  businessId: string;
  name: string;
  email: string;
  role: 'Chef' | 'Server' | 'Manager' | 'Barista';
  hourlyRate: number;
  status: 'Active' | 'Pending'; // For approval workflow
}

export interface Shift {
  id: string;
  businessId: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  hourlyRate: number; // Rate used for this specific shift, allows override
  totalCost: number;
}

// Ingredient usage for Menu Engineering
export interface IngredientUsage {
  inventoryItemId: string;
  quantityUsed: number; // In the BOM unit
  unitUsed: string; // e.g. 'g', 'ml'
  costSnapshot: number; // Calculated cost for this usage
}

export interface MenuItem {
  id: string;
  businessId: string;
  name: string;
  description?: string; // Added description
  category: string;
  sellingPrice: number;
  estimatedCost: number; // COGS
  imageUrl?: string;
  ingredients?: IngredientUsage[]; // BOM
}
