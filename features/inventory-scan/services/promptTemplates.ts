/**
 * Optimized Prompt Templates for Inventory Scanning
 * 
 * Key optimizations:
 * 1. Clear output format (JSON Schema)
 * 2. Known items dictionary (RAG)
 * 3. Few-shot examples (2 compact examples)
 * 4. Multi-angle fusion instructions with CRITICAL warnings
 * 5. Quantity estimation guidance
 * 6. DON'T list to prevent common errors
 * 7. Result validation function
 */

export interface KnownItem {
  name: string;
  unit: string;
  typical_quantity?: string;
  id?: string;
}

export type ScanAreaType = 'storage' | 'prep' | 'fridge';
export type LanguageType = 'en' | 'zh';

export interface PromptOptions {
  imageCount: number;
  scanArea: ScanAreaType;
  knownItems: KnownItem[];
  language?: LanguageType;
}

// Area descriptions
const AREA_DESCRIPTIONS: Record<ScanAreaType, Record<LanguageType, string>> = {
  storage: {
    en: 'dry storage room with shelves, containing packaged ingredients and supplies',
    zh: '乾貨倉庫，有貨架，存放包裝食材和用品'
  },
  prep: {
    en: 'prep station with containers of prepared ingredients (sliced, diced, portioned)',
    zh: '備料區，有容器盛放已處理的食材（切片、切丁、分裝）'
  },
  fridge: {
    en: 'refrigerator/cold storage with fresh produce, proteins, and dairy',
    zh: '冷藏/冷凍區，存放生鮮、肉類、乳製品'
  }
};

// Allowed units for standardized output
const ALLOWED_UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'box', 'bag', 'bottle', 'pack', 'bunch', 'slice', 'portion'];

// Few-shot examples (2 compact examples covering different scenarios)
const FEW_SHOT_EXAMPLES = `
[Example 1 - Clear shelves, direct count]
{"items":[{"name":"Tofu","quantity":3,"unit":"box","confidence":0.95,"estimation_method":"direct_count"}],"scan_quality":"good"}

[Example 2 - Stacked/obscured items, estimation needed]
{"items":[{"name":"Rice","quantity":10,"unit":"kg","confidence":0.7,"estimation_method":"weight_estimate","notes":"2 bags × 5kg each"}],"scan_quality":"medium","suggestions":["Move items forward for clearer view"]}
`;

/**
 * Generate optimized scan prompt
 */
export function generateScanPrompt(options: PromptOptions): string {
  const { imageCount, scanArea, knownItems, language = 'en' } = options;

  // Build known items list (RAG dictionary)
  const knownItemsList = knownItems.length > 0
    ? knownItems
      .map(item => `- ${item.name} (${item.unit})${item.typical_quantity ? ` [typical: ${item.typical_quantity}]` : ''}`)
      .join('\n')
    : '(No preset list, identify all visible items)';

  const multiImageInstructions = imageCount > 1
    ? `
## ⚠️ CRITICAL - Multi-image Rules:
These ${imageCount} images show the SAME area from different angles.
- Count each item ONLY ONCE across all images
- DO NOT double count items visible in multiple photos
- Use the clearest image for quantity determination
- Mark items seen in multiple images with higher confidence
`
    : '';

  return `
# Role
Restaurant inventory scanner. Identify food items and quantities from photos.

# Task
Analyze ${imageCount} image${imageCount > 1 ? 's' : ''} and identify all food items.
${imageCount > 1 ? 'Images are different angles of SAME area - AVOID DUPLICATE COUNTING.' : ''}

# Scan Area
${AREA_DESCRIPTIONS[scanArea][language]}

# Known Items (prioritize matching)
${knownItemsList}

# Output Format
\`\`\`json
{
  "items": [
    {
      "name": "Item name (use known list names if matched)",
      "quantity": number (must be > 0),
      "unit": "ONLY use: ${ALLOWED_UNITS.join('/')}",
      "confidence": 0.0-1.0,
      "estimation_method": "direct_count/visual_estimate/weight_estimate/partial_visible",
      "notes": "optional"
    }
  ],
  "scan_quality": "good/medium/poor",
  "suggestions": ["optional improvement suggestions"]
}
\`\`\`

## Counting Rules:
- direct_count (confidence >0.9): Items clearly countable
- visual_estimate (0.6-0.9): Estimate by visible area/size
- weight_estimate (0.5-0.8): Estimate by container (e.g., 5kg bag)
- partial_visible (<0.6): Partially hidden, inferred
${multiImageInstructions}
# Examples
${FEW_SHOT_EXAMPLES}

# DON'T (Important):
- Don't guess items you cannot see at all
- Don't count the same item twice from different angles
- Don't return quantity as 0 (skip the item instead)
- Don't include non-food items unless kitchen supplies
- Don't add any text outside the JSON format

Analyze the image(s) now:
`.trim();
}

/**
 * Generate a simpler prompt for quick scans
 */
export function generateQuickScanPrompt(
  imageCount: number,
  knownItemNames: string[]
): string {
  return `
Identify food items. Return JSON only, no other text.
${imageCount > 1 ? `${imageCount} images of SAME area - count each item ONCE only.` : ''}
${knownItemNames.length > 0 ? `Match these if possible: ${knownItemNames.join(', ')}` : ''}

{"items":[{"name":"str","quantity":num,"unit":"kg/g/pcs/box/bag/bottle","confidence":0-1}],"scan_quality":"good/medium/poor"}
`.trim();
}

/**
 * Validate and parse AI scan result
 * - Cleans JSON format (removes ```json markers)
 * - Filters invalid items (quantity <= 0, missing fields)
 * - Normalizes number precision
 */
export interface ScanResultItem {
  name: string;
  quantity: number;
  unit: string;
  confidence: number;
  estimation_method?: string;
  notes?: string;
}

export interface ScanResult {
  items: ScanResultItem[];
  scan_quality: 'good' | 'medium' | 'poor';
  suggestions?: string[];
}

export function validateAndParseScanResult(raw: string): ScanResult | null {
  try {
    // Clean JSON markers
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const data = JSON.parse(cleaned);

    if (!data.items || !Array.isArray(data.items)) {
      return null;
    }

    // Filter and validate items
    const validItems: ScanResultItem[] = data.items
      .filter((item: any) =>
        typeof item.name === 'string' &&
        item.name.length > 0 &&
        typeof item.quantity === 'number' &&
        item.quantity > 0 &&
        typeof item.unit === 'string' &&
        typeof item.confidence === 'number'
      )
      .map((item: any) => ({
        name: item.name.trim(),
        quantity: Math.round(item.quantity * 100) / 100,
        unit: item.unit.trim(),
        confidence: Math.round(item.confidence * 100) / 100,
        estimation_method: item.estimation_method,
        notes: item.notes
      }));

    return {
      items: validItems,
      scan_quality: ['good', 'medium', 'poor'].includes(data.scan_quality)
        ? data.scan_quality
        : 'medium',
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : []
    };
  } catch (e) {
    console.error('Failed to parse scan result:', e);
    return null;
  }
}
