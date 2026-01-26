
import { InventoryItem, Recipe, MenuItem, Shift } from "../types";
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
 * 🆕 FEATURE: Analyze Supplier Invoices/Delivery Notes (Inventory + Costing)
 * Uses OCR-optimized prompt to extract Supplier, Items, and Costs
 */
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
  const { generateInvoiceScanPrompt, validateInvoiceScanResult } = await import(
    '../features/inventory-scan/services/promptTemplates'
  );

  // Sanitize known items
  const sanitizedItems = knownItems
    .map(name => name.replace(/[<>{}[\]\\|`~!@#$%^&*()=+;:'"]/g, '').slice(0, 50).trim())
    .filter(name => name.length > 0)
    .slice(0, 20);

  const prompt = generateInvoiceScanPrompt(sanitizedItems);

  console.log(`[Gemini] Invoice scan: ${sanitizedItems.length} known items`);

  const text = await callGeminiApi({
    prompt,
    imageBase64: base64Image,
    mimeType,
    config: {
      temperature: 0,
      topK: 1,
      topP: 0.1,
    }
  });

  if (text) {
    const result = validateInvoiceScanResult(text);
    if (result) {
      return {
        supplier: result.supplier,
        invoiceNumber: result.invoiceNumber,
        date: result.date,
        items: result.items,
        grandTotal: result.grandTotal,
      };
    }
  }

  return { items: [] };
};

/**
 * 🆕 FEATURE: Analyze MULTIPLE Invoice/Receipt Photos (Setup Wizard)
 * Combines results from multiple photos for more accurate item extraction
 * Uses multi-image API for better context across photos
 */
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
  if (images.length === 0) {
    return { items: [] };
  }

  // For single image, just use regular invoice scan
  if (images.length === 1) {
    const result = await analyzeInvoice(images[0].base64, images[0].mimeType, knownItems);
    return {
      supplier: result.supplier,
      items: result.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        unitCost: i.unitCost,
        confidence: i.confidence,
      })),
    };
  }

  // Multi-image analysis
  const { generateInvoiceScanPrompt, validateInvoiceScanResult } = await import(
    '../features/inventory-scan/services/promptTemplates'
  );

  // Sanitize known items
  const sanitizedItems = knownItems
    .map(name => name.replace(/[<>{}[\]\\|`~!@#$%^&*()=+;:'"]/g, '').slice(0, 50).trim())
    .filter(name => name.length > 0)
    .slice(0, 20);

  // Enhanced prompt for multi-image
  const basePrompt = generateInvoiceScanPrompt(sanitizedItems);
  const multiImagePrompt = `
${basePrompt}

⚠️ IMPORTANT: You are analyzing ${images.length} photos of receipts/invoices.
- These may be DIFFERENT receipts or DIFFERENT pages of the same receipt
- Combine ALL items from ALL photos into ONE unified list
- If same item appears in multiple photos, count them ONCE with total quantity
- Extract supplier from whichever photo shows it most clearly
`;

  console.log(`[Gemini] Multi-invoice scan: ${images.length} images, ${sanitizedItems.length} known items`);

  const text = await callGeminiMultiImageApi({
    prompt: multiImagePrompt,
    images,
    config: {
      temperature: 0,
      topK: 1,
      topP: 0.1,
    }
  });

  if (text) {
    const result = validateInvoiceScanResult(text);
    if (result) {
      return {
        supplier: result.supplier,
        items: result.items.map(i => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          unitCost: i.unitCost,
          confidence: i.confidence,
        })),
      };
    }
  }

  return { items: [] };
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

  // 🆕 Analyze existing menu to determine cuisine style
  let cuisineContext = "";
  let detectedCuisine = "General";

  if (menuItems.length > 0) {
    const menuList = menuItems.slice(0, 15).map(m => `${m.name} (${m.category})`).join(', ');
    const categories = [...new Set(menuItems.map(m => m.category))].join(', ');

    // Detect cuisine from menu items
    const menuText = menuItems.map(m => m.name.toLowerCase()).join(' ');
    if (menuText.includes('pizza') || menuText.includes('pasta') || menuText.includes('risotto')) {
      detectedCuisine = "Italian";
    } else if (menuText.includes('brunch') || menuText.includes('latte') || menuText.includes('cappuccino') || menuText.includes('sandwich')) {
      detectedCuisine = "Cafe/Brunch";
    } else if (menuText.includes('sushi') || menuText.includes('ramen') || menuText.includes('tempura')) {
      detectedCuisine = "Japanese";
    } else if (menuText.includes('dim sum') || menuText.includes('fried rice') || menuText.includes('noodle')) {
      detectedCuisine = "Chinese";
    } else if (menuText.includes('taco') || menuText.includes('burrito') || menuText.includes('quesadilla')) {
      detectedCuisine = "Mexican";
    } else if (menuText.includes('curry') || menuText.includes('biryani') || menuText.includes('naan')) {
      detectedCuisine = "Indian";
    }

    cuisineContext = `
=== YOUR EXISTING MENU (Learn from this!) ===
Categories: ${categories}
Sample items: ${menuList}

DETECTED CUISINE STYLE: ${detectedCuisine}
⚠️ IMPORTANT: Generated recipes MUST match this cuisine style!
- If it's a Pizza shop → suggest Italian dishes (pizza variations, pasta, salads)
- If it's a Coffee shop → suggest brunch items (sandwiches, toasts, eggs)
- Match the flavor profile, ingredients, and presentation style of the existing menu.
`;
  }

  const prompt = `
You are a creative Chef specializing in ${detectedCuisine} cuisine.

=== AVAILABLE INGREDIENTS (prioritize expiring items!) ===
${inventoryList}
${cuisineContext}
Create 2 daily specials that:
1. Use ingredients that are expiring soon (marked with fewer days left)
2. Match the detected cuisine style perfectly
3. Would fit naturally on this restaurant's menu

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

export const generateOperationalInsights = async (shifts: Shift[], menu: MenuItem[]): Promise<string> => {
  const totalLabor = shifts.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const prompt = `Analyze: Labor Cost $${totalLabor}, ${menu.length} menu items. Provide 3 operational recommendations.`;
  try { return await callGeminiApi({ prompt }) || "No data."; } catch (e) { return "Error."; }
};

/**
 * 🆕 Ask Operations Advisor - with topic validation to save tokens
 * Only allows questions related to restaurant/store operations
 */
const ALLOWED_TOPICS = [
  'inventory', 'stock', '庫存', '存貨',
  'cost', 'pricing', '成本', '定價', '價格',
  'staff', 'shift', 'labor', '員工', '排班', '人工',
  'menu', 'recipe', '菜單', '食譜',
  'sales', 'revenue', 'profit', '銷售', '營收', '利潤',
  'waste', 'expiry', '浪費', '過期',
  'supplier', 'order', '供應商', '訂貨',
  'efficiency', 'improve', '效率', '改善',
  'forecast', 'predict', '預測',
  'peak', 'busy', '高峰', '繁忙',
];

const OFF_TOPIC_RESPONSES = [
  "🚫 這個問題與店鋪運營無關，請詢問庫存、成本、員工、銷售等相關問題。",
  "🚫 This question is not related to store operations. Please ask about inventory, costs, staff, or sales.",
];

function isOperationsRelated(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return ALLOWED_TOPICS.some(topic => lowerQuery.includes(topic.toLowerCase()));
}

export const askOperationsAdvisor = async (
  userQuery: string,
  context: {
    inventory?: InventoryItem[];
    shifts?: Shift[];
    menu?: MenuItem[];
  }
): Promise<string> => {
  // Validate query is operations-related
  if (!isOperationsRelated(userQuery)) {
    return OFF_TOPIC_RESPONSES[Math.random() < 0.5 ? 0 : 1];
  }

  // Sanitize user input
  const sanitizedQuery = userQuery
    .replace(/[<>{}[\]\\|`~!@#$%^&*()=+]/g, '')
    .slice(0, 200)
    .trim();

  // Build context summary
  const contextParts: string[] = [];

  if (context.inventory && context.inventory.length > 0) {
    const expiringItems = context.inventory
      .filter(i => {
        const daysLeft = Math.ceil((new Date(i.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
        return daysLeft <= 3;
      })
      .slice(0, 5);
    if (expiringItems.length > 0) {
      contextParts.push(`即將過期: ${expiringItems.map(i => i.name).join(', ')}`);
    }
    contextParts.push(`庫存項目數: ${context.inventory.length}`);
  }


  if (context.shifts && context.shifts.length > 0) {
    const totalLabor = context.shifts.reduce((acc, s) => acc + s.totalCost, 0);
    contextParts.push(`人工成本: $${totalLabor.toFixed(2)}`);
  }

  if (context.menu && context.menu.length > 0) {
    contextParts.push(`菜單項目數: ${context.menu.length}`);
  }

  const prompt = `
You are a restaurant operations advisor. Answer ONLY questions related to restaurant/store operations.

=== STORE CONTEXT ===
${contextParts.join('\n') || 'No data available'}

=== USER QUESTION ===
${sanitizedQuery}

Provide a concise, actionable answer (max 3-4 sentences). If the question is off-topic, politely redirect to operations topics.
  `;

  try {
    const response = await callGeminiApi({ prompt });
    return response || "無法獲取建議，請稍後再試。";
  } catch (e) {
    return "服務暫時不可用，請稍後再試。";
  }
};

