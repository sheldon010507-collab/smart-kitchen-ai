
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { InventoryItem, Recipe, SalesReceipt, MenuItem, Shift } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to encode file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * FEATURE: Analyze Images (Receipts for Inventory & Costing)
 * Model: gemini-3-pro-preview
 */
export const analyzeInventoryImage = async (
  base64Image: string, 
  mimeType: string, 
  mode: 'receipt' | 'fridge'
): Promise<Partial<InventoryItem>[]> => {
  
  const today = new Date().toISOString().split('T')[0];
  
  // Prompt optimized for Supplier Invoices (Butcher/Wholesale) and POS Receipts
  const prompt = mode === 'receipt' 
    ? `Analyze this image. It could be a standard POS receipt OR a Supplier Invoice (e.g. butcher, wholesale). 
       Extract all food/inventory items.
       For each line item:
       1. Identify the Name (e.g. 'Brisket Beef', '5Lb pack bacon').
       2. Extract Quantity and Unit (e.g. '3.61 kg', '500 g', '2 packs'). 
          - If the line has 'Packs' and 'Weight', prefer the Weight for quantity if it matches the pricing unit.
       3. Calculate the Unit Cost (Cost per 1 unit of the Quantity).
          - Look for a 'Price Per' column (e.g. £11.70/kg).
          - OR Calculate: Line Total / Quantity (e.g. £42.24 / 3.61kg = 11.70).
       4. Categorize it (Produce, Dairy, Meat, Pantry, etc).
       5. Estimate a typical expiry date starting from today (${today}).
       Return a JSON array.`
    : `Analyze this photo of a fridge/pantry. Identify all visible food items. Estimate quantity if possible. For each item, estimate a reasonable expiry date from today (${today}). Return a JSON array.`;

  const itemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Standardized ingredient name" },
      quantity: { type: Type.STRING, description: "Amount with unit (e.g. 2 kg, 500g)" },
      quantityValue: { type: Type.NUMBER, description: "Numeric amount (e.g. 2)" },
      quantityUnit: { type: Type.STRING, description: "Unit code (e.g. kg, g, L, ml, pcs)" },
      unitCost: { type: Type.NUMBER, description: "Cost per 1 unit of quantityUnit" },
      category: { type: Type.STRING, enum: ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Beverage', 'Other'] },
      location: { type: Type.STRING, enum: ['Fridge', 'Freezer', 'Pantry', 'Walk-in'], description: "Default storage location" },
      expiryDate: { type: Type.STRING, description: "YYYY-MM-DD format" }
    },
    required: ["name", "category", "location", "expiryDate"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: itemSchema
      }
    }
  });

  if (response.text) {
    try {
      return JSON.parse(response.text);
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
    Extract the total amount, the date (YYYY-MM-DD), the time (HH:mm), and a list of all line items sold.
    For each line item, extract the name, quantity, and unit price.
    Also identify the payment method if visible.
    Return a JSON object.
  `;

  const receiptSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING },
      time: { type: Type.STRING },
      totalAmount: { type: Type.NUMBER },
      paymentMethod: { type: Type.STRING },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            price: { type: Type.NUMBER }
          }
        }
      }
    },
    required: ["totalAmount", "items"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: receiptSchema
    }
  });

  if (response.text) {
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse POS receipt JSON", e);
      return {};
    }
  }
  return {};
};

/**
 * FEATURE: Analyze Menu Photo
 */
export const analyzeMenuPhoto = async (base64Image: string, mimeType: string): Promise<MenuItem[]> => {
  const prompt = `
    Analyze this restaurant menu photo.
    Extract all menu items visible.
    For each item, identify the name, price, and category (Food, Beverage, Dessert, etc.).
    Estimate a rough cost (COGS) based on industry standards (approx 30% of price).
    Return a JSON array.
  `;

  const menuSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        category: { type: Type.STRING },
        sellingPrice: { type: Type.NUMBER },
        estimatedCost: { type: Type.NUMBER }
      },
      required: ["name", "sellingPrice", "estimatedCost"]
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: menuSchema
    }
  });

  if (response.text) {
    try {
      const parsed = JSON.parse(response.text);
      return parsed.map((p: any, idx: number) => ({ ...p, id: `scan-${Date.now()}-${idx}` }));
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return [];
};


/**
 * FEATURE: Estimate Menu Costs (COGS)
 */
export const estimateMenuCosts = async (menuItems: string[]): Promise<MenuItem[]> => {
  if (menuItems.length === 0) return [];

  const prompt = `
    I have the following menu items sold in my restaurant: ${menuItems.join(', ')}.
    For each item:
    1. Estimate a realistic selling price.
    2. Estimate the "Cost of Goods Sold" (COGS).
    3. Categorize it.
    Return a JSON array of MenuItems.
  `;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        category: { type: Type.STRING },
        sellingPrice: { type: Type.NUMBER },
        estimatedCost: { type: Type.NUMBER }
      },
      required: ["name", "sellingPrice", "estimatedCost"]
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  });

  if (response.text) {
    try {
      const parsed = JSON.parse(response.text);
      return parsed.map((p: any, idx: number) => ({ ...p, id: `menu-${Date.now()}-${idx}` }));
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return [];
};

/**
 * FEATURE: Think More (AI Chef)
 * Refined for UK Tastes & Expiry Prioritization AND now learns from Existing Menu Style.
 */
export const generateThinkingChefRecipes = async (inventory: InventoryItem[], menuItems: MenuItem[] = []): Promise<Recipe[]> => {
  // Sort by expiring soon to help the AI context
  const sortedInventory = [...inventory].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  
  // Create a descriptive list for the AI
  const inventoryList = sortedInventory.map(i => {
      const daysLeft = Math.ceil((new Date(i.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
      return `- ${i.quantity} ${i.name} (${daysLeft} days left)`;
  }).join('\n');

  // Build existing menu context for style learning
  let menuStyleContext = "";
  if (menuItems.length > 0) {
      const menuList = menuItems.map(m => `- ${m.name} (${m.category})${m.description ? `: ${m.description}` : ''}`).join('\n');
      menuStyleContext = `
      
      === CONTEXT: EXISTING MENU STYLE ===
      The restaurant currently serves the following dishes. Analyze them to understand the "House Style" (cuisine, naming conventions, complexity, flavor profiles):
      ${menuList}
      
      Your task is to generate new specials that FEEL like they belong on this specific menu.
      ====================================
      `;
  }

  const prompt = `
    I have the following ingredients in my kitchen inventory, sorted by expiry (expiring items first):
    
    ${inventoryList}
    
    ${menuStyleContext}
    
    Act as a professional Chef specializing in **British Cuisine** and hearty comfort food (adapting to the specific style of the menu provided above).
    Create 2 distinct "Special of the Day" recipes.
    
    Rules:
    1. **Prioritize using ingredients that are expiring soon** (top of the inventory list).
    2. **Style Match**: The new dishes must fit the inferred cuisine and style of the existing menu (e.g. if the menu is fancy, make fancy specials; if it's a cafe, make cafe specials).
    3. **Local Taste**: Ensure the dishes work well for a UK audience.
    4. Be creative but practical.
    
    Return the result as a JSON array of recipes.
  `;

  // Schema for Recipe
  const recipeSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        cookTime: { type: Type.STRING },
        difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
        ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
        instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
        calories: { type: Type.NUMBER }
      },
      required: ["title", "description", "ingredients", "instructions"]
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: recipeSchema,
      thinkingConfig: {
        thinkingBudget: 32768
      }
    }
  });

  if (response.text) {
    try {
      return JSON.parse(response.text);
    } catch (e) {
      return [];
    }
  }
  return [];
};

/**
 * FEATURE: Fast AI Responses
 */
export const getQuickKitchenTip = async (query: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: `Give me a one-sentence kitchen hack about: ${query}.`,
  });
  return response.text || "Keep your knives sharp!";
};

/**
 * FEATURE: Operational Insights
 */
export const generateOperationalInsights = async (
  sales: SalesReceipt[], 
  shifts: Shift[],
  menu: MenuItem[]
): Promise<string> => {
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalLabor = shifts.reduce((acc, s) => acc + s.totalCost, 0);
  
  const dataSummary = `
    Total Revenue: $${totalRevenue}
    Total Labor Cost: $${totalLabor}
  `;

  const prompt = `
    Act as an expert Restaurant Consultant. Analyze:
    ${dataSummary}
    Provide 3 concise, strategic recommendations.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return response.text || "Insufficient data.";
};
