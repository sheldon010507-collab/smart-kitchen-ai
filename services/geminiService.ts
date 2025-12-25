
import { InventoryItem, Recipe, SalesReceipt, MenuItem, Shift } from "../types";
import { supabase } from "../lib/supabase";

// Helper to encode file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Internal API Caller
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

    if (!token) {
      throw new Error("Unauthorized: You must be logged in to use AI features.");
    }

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
      let errMsg = errText;
      try {
        const json = JSON.parse(errText);
        if (json.error) errMsg = json.error;
      } catch (e) { }
      throw new Error(errMsg || `Server error: ${res.status}`);
    }

    const data = await res.json();
    return data.text;
  } catch (error: any) {
    console.error('Gemini Service Call Failed:', error);
    throw error;
  }
};

/**
 * FEATURE: Analyze Images (Receipts for Inventory & Costing)
 * Supports RAG (dictionary) for better name matching
 */
export const analyzeInventoryImage = async (
  base64Image: string,
  mimeType: string,
  mode: 'receipt' | 'fridge',
  dictionary: string[] = []
): Promise<any[]> => {

  const today = new Date().toISOString().split('T')[0];
  const dictStr = dictionary.slice(0, 400).join("、");

  const ragContext = dictStr
    ? `Context: Known ingredients dictionary: [${dictStr}]. If a name is similar, prefer the dictionary name. If unsure, provide alternatives in 'candidates'.`
    : "";

  const prompt = mode === 'receipt'
    ? `Analyze this receipt/invoice. Extract food items.
       ${ragContext}
       For each item:
       1. Name (standardized).
       2. Quantity (value & unit). 
       3. Unit Cost & Total Price.
       4. Category (Produce/Dairy/Meat/Pantry/Frozen/Beverage/Other).
       5. Expiry Date (dd/mm/yyyy) starting from ${today}.
       6. Confidence (0-1).
       Return a JSON array.`
    : `Analyze this fridge/pantry photo. Identify items.
       ${ragContext}
       Estimate quantity.
       Return a JSON array.`;

  const itemSchema = {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      quantityValue: { type: "NUMBER" },
      quantityUnit: { type: "STRING" },
      unitCost: { type: "NUMBER" },
      totalPrice: { type: "NUMBER" },
      category: { type: "STRING" },
      location: { type: "STRING" },
      expiryDate: { type: "STRING" },
      confidence: { type: "NUMBER" },
      is_new_item: { type: "BOOLEAN" },
      candidates: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ["name"]
  };

  const text = await callGeminiApi({
    prompt,
    imageBase64: base64Image,
    mimeType,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: "ARRAY",
        items: itemSchema
      }
    }
  });

  if (text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON", e);
      return [];
    }
  }
  return [];
};

/**
 * FEATURE: Analyze POS Receipts (Revenue Recognition)
 */
export const analyzePOSReceipt = async (base64Image: string, mimeType: string): Promise<Partial<SalesReceipt>> => {
  const prompt = `
    Analyze this restaurant POS receipt. 
    Extract total amount, date (dd/mm/yyyy or yyyy-mm-dd), time, and items.
    Return a JSON object.
  `;

  const receiptSchema = {
    type: "OBJECT",
    properties: {
      date: { type: "STRING" },
      time: { type: "STRING" },
      total_amount: { type: "NUMBER" },
      totalAmount: { type: "NUMBER" }, // Cover both cases
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            quantity: { type: "NUMBER" },
            price: { type: "NUMBER" }
          }
        }
      }
    },
    required: ["items"]
  };

  const text = await callGeminiApi({
    prompt,
    imageBase64: base64Image,
    mimeType,
    config: {
      responseMimeType: 'application/json',
      responseSchema: receiptSchema
    }
  });

  if (text) {
    try {
      const parsed = JSON.parse(text);
      // Normalize keys
      if (parsed.total_amount && !parsed.totalAmount) parsed.totalAmount = parsed.total_amount;
      return parsed;
    } catch (e) {
      return {};
    }
  }
  return {};
};

// ... Rest of the file (Menu Photo, Costs, Recipes, Tips, Insights) ...
// Reuse previous implementations for those
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
  if (text) { try { return JSON.parse(text).map((p: any, i: number) => ({ ...p, id: `scan-${Date.now()}-${i}` })); } catch (e) { } }
  return [];
};

export const estimateMenuCosts = async (menuItems: string[]): Promise<MenuItem[]> => {
  if (!menuItems.length) return [];
  const prompt = `Estimate COGS for: ${menuItems.join(', ')}. JSON array of {name, category, sellingPrice, estimatedCost}.`;
  const schema = { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, category: { type: "STRING" }, sellingPrice: { type: "NUMBER" }, estimatedCost: { type: "NUMBER" } } } };
  const text = await callGeminiApi({ prompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
  if (text) { try { return JSON.parse(text).map((p: any, i: number) => ({ ...p, id: `menu-${Date.now()}-${i}` })); } catch (e) { } }
  return [];
};

export const generateThinkingChefRecipes = async (inventory: InventoryItem[], menuItems: MenuItem[] = []): Promise<Recipe[]> => {
  const sortedInventory = [...inventory].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  const inventoryList = sortedInventory.map(i => {
    const daysLeft = Math.ceil((new Date(i.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
    return `- ${i.quantity} ${i.name} (${daysLeft} days left)`;
  }).join('\n');

  let menuStyleContext = "";
  if (menuItems.length > 0) {
    const menuList = menuItems.map(m => `- ${m.name} (${m.category})`).join('\n');
    menuStyleContext = `\n=== EXISTING MENU ===\n${menuList}\nGenerate specials that fit this style.\n`;
  }

  const prompt = `
    I have these ingredients (expiring first):
    ${inventoryList}
    ${menuStyleContext}
    Act as a Chef (British Cuisine). Create 2 specials utilizing expiring items.
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

  const text = await callGeminiApi({
    prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: recipeSchema
    }
  });

  if (text) { try { return JSON.parse(text); } catch (e) { return []; } }
  return [];
};

export const getQuickKitchenTip = async (query: string): Promise<string> => {
  return await callGeminiApi({ prompt: `Kitchen hack for: ${query}` }) || "Keep your knives sharp!";
};

export const generateOperationalInsights = async (sales: SalesReceipt[], shifts: Shift[], menu: MenuItem[]): Promise<string> => {
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalLabor = shifts.reduce((acc, s) => acc + s.totalCost, 0);
  const prompt = `Analyze: Revenue $${totalRevenue}, Labor $${totalLabor}. 3 recommendations.`;
  try { return await callGeminiApi({ prompt }) || "No data."; } catch (e) { return "Error."; }
};
