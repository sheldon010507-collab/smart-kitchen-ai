/**
 * AI Vision Service - Inventory Image Recognition
 * 
 * Uses existing geminiService API pattern for image analysis
 */

import { RecognizedItem, ScanAreaType } from '../types';
import { supabase } from '../../../lib/supabase';

/**
 * Call Gemini API for inventory image recognition
 */
async function callGeminiVision(payload: {
    prompt: string;
    imageBase64: string;
    mimeType: string;
}): Promise<string> {
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
        body: JSON.stringify({
            prompt: payload.prompt,
            imageBase64: payload.imageBase64,
            mimeType: payload.mimeType,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            name: { type: "STRING" },
                            quantity: { type: "NUMBER" },
                            unit: { type: "STRING" },
                            confidence: { type: "NUMBER" },
                            notes: { type: "STRING" }
                        },
                        required: ["name", "quantity", "unit", "confidence"]
                    }
                }
            }
        })
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
}

/**
 * Area descriptions for prompts
 */
const AREA_DESCRIPTIONS: Record<ScanAreaType, string> = {
    front: 'Front prep area with prepared ingredients (sliced, diced, marinated items, etc.)',
    back: 'Back kitchen area with ingredients being used for cooking',
    storage: 'Storage/fridge/freezer with raw unprepared ingredients'
};

/**
 * Recognize inventory items from an image using Gemini Vision
 */
export async function recognizeInventoryImage(
    imageBase64: string,
    mimeType: string,
    scanArea: ScanAreaType,
    knownSKUs: Array<{ id: string; name: string; unit: string; sku_code?: string }>
): Promise<RecognizedItem[]> {

    // Build SKU list for better matching
    const skuListText = knownSKUs.length > 0
        ? knownSKUs.map(s => `- ${s.name} (${s.unit})`).join('\n')
        : 'No known items registered yet.';

    const prompt = `
You are a professional restaurant inventory recognition system. Analyze this image and identify all food items and their quantities.

**Scan Area**: ${AREA_DESCRIPTIONS[scanArea]}

**Known Items** (prefer matching these):
${skuListText}

**Task**:
1. Identify ALL visible food items/ingredients
2. Estimate quantity for each item
3. Provide confidence score (0-1) for each recognition

**Output Format** (must be valid JSON array):
[
  {
    "name": "Item name",
    "quantity": number,
    "unit": "kg/box/piece/bottle/etc",
    "confidence": 0.0-1.0,
    "notes": "Any additional notes"
  }
]

**Rules**:
- If quantity is uncertain, provide best estimate
- For blurry/unclear items, set lower confidence
- Prefer matching known item names when similar
- Only output the JSON array, no other text
`;

    try {
        const text = await callGeminiVision({
            prompt,
            imageBase64,
            mimeType
        });

        // Parse JSON response
        const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
        const recognized: RecognizedItem[] = JSON.parse(cleanedText);

        // Try to match recognized items to known SKUs
        return recognized.map(item => {
            const matchedSKU = knownSKUs.find(sku =>
                sku.name.toLowerCase().includes(item.name.toLowerCase()) ||
                item.name.toLowerCase().includes(sku.name.toLowerCase()) ||
                (sku.sku_code && item.name.toLowerCase().includes(sku.sku_code.toLowerCase()))
            );

            return {
                ...item,
                matched_sku_id: matchedSKU?.id
            };
        });

    } catch (error) {
        console.error('Vision API error:', error);
        throw new Error('Image recognition failed. Please try again.');
    }
}

/**
 * Batch scan multiple images
 */
export async function batchScanImages(
    images: Array<{ base64: string; mimeType: string; area: ScanAreaType }>,
    knownSKUs: Array<{ id: string; name: string; unit: string }>
): Promise<Map<ScanAreaType, RecognizedItem[]>> {
    const results = new Map<ScanAreaType, RecognizedItem[]>();

    for (const image of images) {
        const items = await recognizeInventoryImage(
            image.base64,
            image.mimeType,
            image.area,
            knownSKUs
        );

        // Merge results for same area
        const existing = results.get(image.area) || [];
        results.set(image.area, [...existing, ...items]);
    }

    return results;
}

/**
 * Merge recognized items (combine duplicates)
 */
export function mergeRecognizedItems(items: RecognizedItem[]): RecognizedItem[] {
    const merged = new Map<string, RecognizedItem>();

    items.forEach(item => {
        const key = item.matched_sku_id || item.name.toLowerCase();
        const existing = merged.get(key);

        if (existing) {
            // Combine quantities, keep higher confidence
            merged.set(key, {
                ...existing,
                quantity: existing.quantity + item.quantity,
                confidence: Math.max(existing.confidence, item.confidence)
            });
        } else {
            merged.set(key, { ...item });
        }
    });

    return Array.from(merged.values());
}
