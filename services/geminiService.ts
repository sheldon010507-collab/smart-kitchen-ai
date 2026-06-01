import { InventoryItem, Recipe, MenuItem, Shift } from "../types";
import { supabase } from "../lib/supabase";
import {
  buildMultiInvoicePrompt,
  generateInvoiceScanPrompt,
  sanitizeKnownItems,
  validateInvoiceScanResult,
} from './invoiceVision';

const INVOICE_ITEM_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    quantity: { type: "NUMBER" },
    unit: { type: "STRING" },
    unitCost: { type: "NUMBER" },
    totalPrice: { type: "NUMBER" },
    confidence: { type: "NUMBER" },
    notes: { type: "STRING" }
  },
  required: ["name", "quantity", "unit"]
};

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const callGeminiApi = async (payload: {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  model?: string;
  config?: any;
}): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Unauthorized: You must be logged in to use AI features.");

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      try {
        const json = JSON.parse(errText);
        throw new Error(json.error || errText || `Server error: ${res.status}`);
      } catch {
        throw new Error(errText || `Server error: ${res.status}`);
      }
    }

    const data = await res.json();
    return data.text;
  } catch (error) {
    console.error('Gemini Service Call Failed:', error);
    throw error;
  }
};

const callGeminiMultiImageApi = async (payload: {
  prompt: string;
  images: Array<{ base64: string; mimeType: string }>;
  config?: any;
}): Promise<string> => {
  return callGeminiApi(payload as any);
};

export const analyzeInvoice = async (
  base64Image: string,
  mimeType: string,
  knownItems: string[] = []
): Promise<{
  supplier?: string;
  invoiceNumber?: string;
  date?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalPrice: number;
    confidence: number;
    notes?: string;
  }>;
  grandTotal?: number;
}> => {
  const sanitizedItems = sanitizeKnownItems(knownItems);
  const text = await callGeminiApi({
    prompt: generateInvoiceScanPrompt(sanitizedItems),
    imageBase64: base64Image,
    mimeType,
    config: invoiceResponseConfig(),
  });

  const result = text ? validateInvoiceScanResult(text) : null;
  return result ? {
    supplier: result.supplier,
    invoiceNumber: result.invoiceNumber,
    date: result.date,
    items: result.items,
    grandTotal: result.grandTotal,
  } : { items: [] };
};

export const analyzeMultipleInvoices = async (
  images: Array<{ base64: string; mimeType: string }>,
  knownItems: string[] = []
): Promise<{
  supplier?: string;
  items: Array<{
    name: string;
    quantity?: number;
    unit: string;
    unitCost?: number;
    confidence: number;
  }>;
}> => {
  if (images.length === 0) return { items: [] };
  if (images.length === 1) {
    const result = await analyzeInvoice(images[0].base64, images[0].mimeType, knownItems);
    return {
      supplier: result.supplier,
      items: result.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        confidence: item.confidence,
      })),
    };
  }

  const sanitizedItems = sanitizeKnownItems(knownItems);
  const basePrompt = generateInvoiceScanPrompt(sanitizedItems);
  const text = await callGeminiMultiImageApi({
    prompt: buildMultiInvoicePrompt(basePrompt, images.length),
    images,
    config: invoiceResponseConfig(),
  });

  const result = text ? validateInvoiceScanResult(text) : null;
  return result ? {
    supplier: result.supplier,
    items: result.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      confidence: item.confidence,
    })),
  } : { items: [] };
};

export const analyzeMenuPhoto = async (base64Image: string, mimeType: string): Promise<MenuItem[]> => {
  const prompt = `Analyze this menu. Extract items (name, price, category). Estimate COGS. JSON array.`;
  const menuSchema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        category: { type: "STRING" },
        sellingPrice: { type: "NUMBER" },
        estimatedCost: { type: "NUMBER" }
      },
      required: ["name", "sellingPrice"]
    }
  };
  const text = await callGeminiApi({ prompt, imageBase64: base64Image, mimeType, config: { responseMimeType: 'application/json', responseSchema: menuSchema } });
  if (text) {
    try { return JSON.parse(text).map((item: any) => ({ ...item, id: crypto.randomUUID() })); } catch {}
  }
  return [];
};

export const estimateMenuCosts = async (menuItems: string[]): Promise<MenuItem[]> => {
  if (!menuItems.length) return [];
  const prompt = `Estimate COGS for: ${menuItems.join(', ')}. JSON array of {name, category, sellingPrice, estimatedCost}.`;
  const schema = { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, category: { type: "STRING" }, sellingPrice: { type: "NUMBER" }, estimatedCost: { type: "NUMBER" } } } };
  const text = await callGeminiApi({ prompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
  if (text) {
    try { return JSON.parse(text).map((item: any) => ({ ...item, id: crypto.randomUUID() })); } catch {}
  }
  return [];
};

export const generateThinkingChefRecipes = async (inventory: InventoryItem[], menuItems: MenuItem[] = []): Promise<Recipe[]> => {
  const sortedInventory = [...inventory].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  const inventoryList = sortedInventory.map(item => {
    const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
    return `- ${item.quantity} ${item.name} (${daysLeft} days left)`;
  }).join('\n');
  const menuContext = buildMenuCuisineContext(menuItems);

  const prompt = `
You are a creative Chef.

AVAILABLE INGREDIENTS:
${inventoryList}

${menuContext}

Create 2 daily specials that use expiring items and fit this restaurant's menu.
Return JSON array of recipes.
`;

  const recipeSchema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING" },
        title: { type: "STRING" },
        description: { type: "STRING" },
        cookTime: { type: "STRING" },
        difficulty: { type: "STRING", enum: ['Easy', 'Medium', 'Hard'] },
        ingredients: { type: "ARRAY", items: { type: "STRING" } },
        instructions: { type: "ARRAY", items: { type: "STRING" } },
        missingIngredients: { type: "ARRAY", items: { type: "STRING" } },
        calories: { type: "NUMBER" }
      },
      required: ["title", "description", "ingredients", "instructions"]
    }
  };

  const text = await callGeminiApi({ prompt, config: { responseMimeType: 'application/json', responseSchema: recipeSchema } });
  if (text) {
    try { return JSON.parse(text); } catch { return []; }
  }
  return [];
};

export const getQuickKitchenTip = async (query: string): Promise<string> => {
  return await callGeminiApi({ prompt: `Kitchen hack for: ${query}` }) || "Keep your knives sharp!";
};

export const generateOperationalInsights = async (shifts: Shift[], menu: MenuItem[]): Promise<string> => {
  const totalLabor = shifts.reduce((acc, shift) => acc + (shift.totalCost || 0), 0);
  const prompt = `Analyze: Labor Cost $${totalLabor}, ${menu.length} menu items. Provide 3 operational recommendations.`;
  try { return await callGeminiApi({ prompt }) || "No data."; } catch { return "Error."; }
};

export const askOperationsAdvisor = async (
  userQuery: string,
  context: {
    inventory?: InventoryItem[];
    shifts?: Shift[];
    menu?: MenuItem[];
  }
): Promise<string> => {
  if (!isOperationsRelated(userQuery)) {
    return "This question is not related to store operations. Please ask about inventory, costs, staff, menu, sales, or suppliers.";
  }

  const sanitizedQuery = userQuery.replace(/[<>{}[\]\\|`~!@#$%^&*()=+]/g, '').slice(0, 200).trim();
  const contextParts = buildOperationsContext(context);
  const prompt = `
You are a restaurant operations advisor. Answer only questions related to restaurant/store operations.

STORE CONTEXT:
${contextParts.join('\n') || 'No data available'}

USER QUESTION:
${sanitizedQuery}

Provide a concise, actionable answer.
`;

  try {
    return await callGeminiApi({ prompt }) || "No recommendation available.";
  } catch {
    return "Service is temporarily unavailable. Please try again later.";
  }
};

function invoiceResponseConfig() {
  return {
    temperature: 0,
    topK: 1,
    topP: 0.1,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
    responseSchema: {
      type: "OBJECT",
      properties: {
        supplier: { type: "STRING" },
        invoiceNumber: { type: "STRING" },
        date: { type: "STRING" },
        items: { type: "ARRAY", items: INVOICE_ITEM_SCHEMA },
        subtotal: { type: "NUMBER" },
        tax: { type: "NUMBER" },
        grandTotal: { type: "NUMBER" },
        scanQuality: { type: "STRING" }
      }
    }
  };
}

function buildMenuCuisineContext(menuItems: MenuItem[]): string {
  if (!menuItems.length) return '';
  const menuList = menuItems.slice(0, 15).map(item => `${item.name} (${item.category})`).join(', ');
  const categories = [...new Set(menuItems.map(item => item.category))].join(', ');
  return `EXISTING MENU:\nCategories: ${categories}\nSample items: ${menuList}`;
}

function buildOperationsContext(context: { inventory?: InventoryItem[]; shifts?: Shift[]; menu?: MenuItem[] }): string[] {
  const contextParts: string[] = [];
  if (context.inventory?.length) {
    const expiringItems = context.inventory
      .filter(item => {
        const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
        return daysLeft <= 3;
      })
      .slice(0, 5);
    if (expiringItems.length) contextParts.push(`Expiring soon: ${expiringItems.map(item => item.name).join(', ')}`);
    contextParts.push(`Inventory items: ${context.inventory.length}`);
  }
  if (context.shifts?.length) {
    const totalLabor = context.shifts.reduce((acc, shift) => acc + shift.totalCost, 0);
    contextParts.push(`Labor cost: $${totalLabor.toFixed(2)}`);
  }
  if (context.menu?.length) contextParts.push(`Menu items: ${context.menu.length}`);
  return contextParts;
}

const ALLOWED_TOPICS = [
  'inventory', 'stock', 'cost', 'pricing', 'staff', 'shift', 'labor',
  'menu', 'recipe', 'sales', 'revenue', 'profit', 'waste', 'expiry',
  'supplier', 'order', 'efficiency', 'improve', 'forecast', 'predict',
  'peak', 'busy', '库存', '成本', '员工', '菜单', '销售', '浪费', '过期',
];

function isOperationsRelated(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return ALLOWED_TOPICS.some(topic => lowerQuery.includes(topic.toLowerCase()));
}
