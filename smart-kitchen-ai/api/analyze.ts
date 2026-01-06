import { GoogleGenAI, Type, Schema } from "@google/genai";

export const config = {
    runtime: 'edge', // Using Edge runtime for speed
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { image, mimeType, mode } = await req.json();

        if (!image || !mode) {
            return new Response(JSON.stringify({ error: 'Missing image or mode' }), { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Server misconfiguration: No API Key found' }), { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });
        const today = new Date().toISOString().split('T')[0];

        // --- Reconstruct Prompts on Server Side ---
        let prompt = "";
        let responseSchema: any = null;

        if (mode === 'receipt') {
            prompt = `Analyze this image. It could be a standard POS receipt OR a Supplier Invoice (e.g. butcher, wholesale). 
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
       Return a JSON array.`;

            responseSchema = {
                type: Type.ARRAY,
                items: {
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
                }
            };

        } else if (mode === 'fridge') {
            prompt = `Analyze this photo of a fridge/pantry. Identify all visible food items. Estimate quantity if possible. For each item, estimate a reasonable expiry date from today (${today}). Return a JSON array.`;

            responseSchema = {
                type: Type.ARRAY,
                items: {
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
                }
            };
        } else {
            return new Response(JSON.stringify({ error: 'Invalid mode' }), { status: 400 });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Updated to 3-Flash as requested
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType || 'image/jpeg', data: image } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema
            }
        });

        return new Response(JSON.stringify(JSON.parse(response.text || "[]")), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}
