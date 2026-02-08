export type View = 'dashboard' | 'set-par' | 'restock' | 'take-inventory' | 'order' | 'operations' | 'ai-chef';

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Dairy' | 'Produce' | 'Pantry' | 'Bakery' | 'Canned' | 'Spices' | 'Meat' | 'Alcohol' | 'Dry Goods' | 'Oils';
  currentStock: number;
  unit: string;
  par: number;
  supplier?: string;
  value?: number; // for operations
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface ChartData {
  name: string;
  value: number;
}
