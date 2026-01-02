
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
 * ✅ P2 Fix: Sanitize user input to prevent prompt injection
 * Allows: letters (any script), numbers, spaces, hyphens, basic punctuation
 */
const sanitizeIngredientName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/[<>{}[\]\\|`~!@#$%^&*()=+;:'"]/g, '') // Remove dangerous chars
    .slice(0, 50) // Limit length
    .trim();
};

/**
 * 🆕 Multi-image API caller for multi-angle scanning
 */
const callGeminiMultiImageApi = async (payload: {
  prompt: string;
  images: Array<{ base64: string; mimeType: string }>;
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
    console.error('Gemini Multi-Image API Call Failed:', error);
    throw error;
  }
};

import type { DictionaryItem, FridgeAuditResult } from '../features/inventory-scan/types';

/**
 * 🆕 Analyze multiple images for Fridge Audit
 * Returns found, not_found, and new_items for inventory reconciliation
 */
export const analyzeFridgeAudit = async (
  images: Array<{ base64: string; mimeType: string }>,
  dictionary: DictionaryItem[] = []
): Promise<FridgeAuditResult | null> => {
  const { generateFridgeAuditPrompt, validateFridgeAuditResult } = await import(
    '../features/inventory-scan/services/promptTemplates'
  );

  // Generate Fridge Audit specific prompt
  const prompt = generateFridgeAuditPrompt({
    imageCount: images.length,
    dictionary,
  });

  console.log(`[Gemini] Fridge Audit: ${images.length} images, ${dictionary.length} known items`);

  const text = await callGeminiMultiImageApi({
    prompt,
    images,
    config: {
      temperature: 0,
      topK: 1,
      topP: 0.1,
    }
  });

  if (text) {
    return validateFridgeAuditResult(text);
  }
  return null;
};

/**
 * Analyze multiple images from different angles (legacy - for backward compatibility)
 * Sends all images in a single API call for accurate fusion
 */
export const analyzeMultiAngleImages = async (
  images: Array<{ base64: string; mimeType: string }>,
  scanArea: 'fridge' | 'storage' | 'prep' = 'fridge',
  dictionary: string[] = []
): Promise<any[]> => {
  const { generateMultiAngleScanPrompt, validateAndParseScanResult } = await import(
    '../features/inventory-scan/services/promptTemplates'
  );

  // Sanitize and limit dictionary
  const sanitizedDict = dictionary
    .map(sanitizeIngredientName)
    .filter(name => name.length > 0)
    .slice(0, 50);

  // Build known items for prompt
  const knownItems = sanitizedDict.map(name => ({ name, unit: 'pcs' }));

  // Generate multi-angle specific prompt
  const prompt = generateMultiAngleScanPrompt({
    imageCount: images.length,
    scanArea,
    knownItems,
  });

  console.log(`[Gemini] Analyzing ${images.length} images, prompt length: ${prompt.length}`);

  // Minimal schema for faster response
  const itemSchema = {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      quantity: { type: "NUMBER" },
      unit: { type: "STRING" },
      confidence: { type: "NUMBER" },
      notes: { type: "STRING" }
    },
    required: ["name", "quantity", "unit"]
  };

  const text = await callGeminiMultiImageApi({
    prompt,
    images,
    config: {
      temperature: 0,
      topK: 1,
      topP: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: "OBJECT",
        properties: {
          items: { type: "ARRAY", items: itemSchema },
          scan_quality: { type: "STRING" }
        }
      }
    }
  });

  if (text) {
    try {
      // Try optimized parser first
      const result = validateAndParseScanResult(text);
      if (result && result.items.length > 0) {
        return result.items.map(item => ({
          name: item.name,
          quantityValue: item.quantity,
          quantityUnit: item.unit,
          confidence: item.confidence,
          notes: item.notes
        }));
      }
      // Fallback to direct parse
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : (parsed.items || []);
    } catch (e) {
      console.error("Failed to parse multi-image JSON", e);
      return [];
    }
  }
  return [];
};

/**
 * FEATURE: Analyze Images (Receipts for Inventory & Costing)
 * ✅ OPTIMIZED: Uses selectPrompt for faster API response
 */
export const analyzeInventoryImage = async (
  base64Image: string,
  mimeType: string,
  mode: 'receipt' | 'fridge',
  dictionary: string[] = []
): Promise<any[]> => {
  // Import optimized prompt generator
  const { selectPrompt, validateAndParseScanResult } = await import(
    '../features/inventory-scan/services/promptTemplates'
  );

  // ✅ Limit dictionary to 50 items for faster processing
  const sanitizedDict = dictionary
    .map(sanitizeIngredientName)
    .filter(name => name.length > 0)
    .slice(0, 50);

  // Build known items for prompt
  const knownItems = sanitizedDict.map(name => ({ name, unit: 'pcs' }));

  // ✅ Use optimized prompt selector
  const prompt = selectPrompt({
    imageCount: 1,
    scanArea: mode === 'fridge' ? 'fridge' : 'storage',
    knownItems,
  });

  // Minimal schema for faster response
  const itemSchema = {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      quantity: { type: "NUMBER" },
      unit: { type: "STRING" },
      confidence: { type: "NUMBER" },
      notes: { type: "STRING" }
    },
    required: ["name", "quantity", "unit"]
  };

  const text = await callGeminiApi({
    prompt,
    imageBase64: base64Image,
    mimeType,
    config: {
      temperature: 0,
      topK: 1,
      topP: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: "OBJECT",
        properties: {
          items: { type: "ARRAY", items: itemSchema },
          scan_quality: { type: "STRING" }
        }
      }
    }
  });

  if (text) {
    try {
      // Try optimized parser first
      const result = validateAndParseScanResult(text);
      if (result && result.items.length > 0) {
        return result.items.map(item => ({
          name: item.name,
          quantityValue: item.quantity,
          quantityUnit: item.unit,
          confidence: item.confidence,
          notes: item.notes
        }));
      }
      // Fallback to direct parse
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : (parsed.items || []);
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
