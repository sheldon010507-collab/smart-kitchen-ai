/**
 * Optimized Prompt Templates for Inventory Scanning
 * 
 * Key optimizations:
 * 1. Clear output format (JSON Schema)
 * 2. Enhanced RAG dictionary with package sizes, visual descriptions, aliases
 * 3. Few-shot examples (10 comprehensive examples)
 * 4. Multi-angle fusion instructions with CRITICAL warnings
 * 5. Quantity estimation guidance
 * 6. DON'T list to prevent common errors
 * 7. Result validation function
 */

export interface KnownItem {
  id?: string;
  name: string;
  unit: string;
  category?: string;                 // 分類，如 '蔬菜', '肉類'
  typical_quantity?: string;         // 典型庫存量
  typical_package_size?: string;     // 典型包裝規格，如 '5kg袋'
  visual_description?: string;       // 視覺描述，如 '紅色包裝'
  aliases?: string[];                // 別名列表
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

// Common package sizes for reference (helps AI estimate quantities)
const COMMON_PACKAGE_SIZES = `
## Common Package References:
- Rice/Flour bags: usually 1kg, 2kg, 5kg, 10kg, 25kg
- Oil bottles: 500ml, 1L, 2L, 5L
- Canned goods: 400g, 800g, 2.5kg
- Eggs: 6pcs, 10pcs, 12pcs (dozen), 30pcs (tray)
- Vegetables (bunch): ~200-300g per bunch
- Meat trays: typically 500g or 1kg
- Milk/Cream: 250ml, 500ml, 1L, 2L
- Sauce bottles: 150ml, 300ml, 500ml, 1L
`;

// Few-shot examples (10 comprehensive examples covering all quantity estimation scenarios)
const FEW_SHOT_EXAMPLES = `
[Example 1 - Direct count, clearly visible individual items]
Input: 3 boxes of tofu on shelf, labels facing camera
{"items":[{"name":"Tofu","quantity":3,"unit":"box","confidence":0.95,"estimation_method":"direct_count","notes":"3 boxes clearly visible"}],"scan_quality":"good"}

[Example 2 - Package size estimation from label]
Input: 2 rice bags with "5kg" printed on them
{"items":[{"name":"Rice","quantity":10,"unit":"kg","confidence":0.9,"estimation_method":"weight_estimate","notes":"2 bags × 5kg = 10kg"}],"scan_quality":"good"}

[Example 3 - Partial visibility, conservative estimate]
Input: Stack of egg trays, only front row visible, 3 high
{"items":[{"name":"Eggs","quantity":90,"unit":"pcs","confidence":0.6,"estimation_method":"partial_visible","notes":"3 trays × 30pcs = 90 minimum"}],"scan_quality":"medium","suggestions":["Check depth of stack"]}

[Example 4 - Visual volume estimation for loose items]
Input: Container half full with diced onions, ~2L container
{"items":[{"name":"Diced Onion","quantity":500,"unit":"g","confidence":0.65,"estimation_method":"visual_estimate","notes":"~1L volume ≈ 500g for diced veg"}],"scan_quality":"medium"}

[Example 5 - Multiple item types]
Input: Shelf with 5 oil bottles (1L each), 2 sauce bottles, 6 visible cans
{"items":[
  {"name":"Cooking Oil","quantity":5,"unit":"L","confidence":0.9,"estimation_method":"direct_count","notes":"5 × 1L"},
  {"name":"Soy Sauce","quantity":2,"unit":"bottle","confidence":0.7,"estimation_method":"direct_count","notes":"2 bottles"},
  {"name":"Canned Tomatoes","quantity":6,"unit":"pcs","confidence":0.5,"estimation_method":"partial_visible","notes":"6 front row"}
],"scan_quality":"medium"}

[Example 6 - Bottles with visible labels]
Input: Sauce rack with 8 bottles, labels show 500ml
{"items":[{"name":"Teriyaki Sauce","quantity":4,"unit":"L","confidence":0.85,"estimation_method":"weight_estimate","notes":"8 bottles × 500ml = 4L"}],"scan_quality":"good"}

[Example 7 - Fresh produce in crate]
Input: Wooden crate 3/4 full of tomatoes, crate size ~40×30×20cm
{"items":[{"name":"Tomatoes","quantity":8,"unit":"kg","confidence":0.6,"estimation_method":"visual_estimate","notes":"~18L × 75% fill × 0.6kg/L ≈ 8kg"}],"scan_quality":"medium","suggestions":["Weigh for accuracy"]}

[Example 8 - Frozen items in bags]
Input: Freezer shelf with 6 frozen dumpling bags, stacked 2 deep
{"items":[{"name":"Frozen Dumplings","quantity":6,"unit":"bag","confidence":0.7,"estimation_method":"partial_visible","notes":"3 visible × 2 deep = 6 bags"}],"scan_quality":"medium"}

[Example 9 - Mixed containers on prep station]
Input: Prep area with 2 full gastro pans of sliced peppers, 1 half-full pan of mushrooms
{"items":[
  {"name":"Sliced Peppers","quantity":4,"unit":"kg","confidence":0.75,"estimation_method":"visual_estimate","notes":"2 full GN pans × 2kg each"},
  {"name":"Mushrooms","quantity":1,"unit":"kg","confidence":0.65,"estimation_method":"visual_estimate","notes":"1 half-full pan ≈ 1kg"}
],"scan_quality":"medium"}

[Example 10 - Low light/cluttered scene]
Input: Dark storage corner, can see ~4 large bags, labels not readable
{"items":[{"name":"Unknown Bags","quantity":4,"unit":"bag","confidence":0.4,"estimation_method":"partial_visible","notes":"4 bags visible, type unclear"}],"scan_quality":"poor","suggestions":["Improve lighting","Move for clearer view"]}
`;

/**
 * Generate optimized scan prompt
 */
export function generateScanPrompt(options: PromptOptions): string {
  const { imageCount, scanArea, knownItems, language = 'en' } = options;

  // Build enhanced known items list (RAG dictionary with package sizes, visual descriptions)
  const knownItemsList = knownItems.length > 0
    ? knownItems
      .map(item => {
        let entry = `- ${item.name} (${item.unit})`;
        if (item.typical_package_size) entry += ` [package: ${item.typical_package_size}]`;
        if (item.visual_description) entry += ` [looks: ${item.visual_description}]`;
        if (item.aliases?.length) entry += ` [also: ${item.aliases.join(', ')}]`;
        if (item.typical_quantity) entry += ` [usual: ${item.typical_quantity}]`;
        return entry;
      })
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
Expert restaurant inventory scanner. Your PRIMARY task is to ACCURATELY estimate quantities from photos.

# Task
Analyze ${imageCount} image${imageCount > 1 ? 's' : ''} and identify all food items WITH PRECISE QUANTITIES.
${imageCount > 1 ? 'Images are different angles of SAME area - AVOID DUPLICATE COUNTING.' : ''}

# Scan Area
${AREA_DESCRIPTIONS[scanArea][language]}

# Known Items (prioritize matching)
${knownItemsList}

${COMMON_PACKAGE_SIZES}

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
      "notes": "REQUIRED: Show your calculation (e.g., '3 bags × 5kg = 15kg')"
    }
  ],
  "scan_quality": "good/medium/poor",
  "suggestions": ["optional improvement suggestions"]
}
\`\`\`

## ⚠️ QUANTITY ESTIMATION RULES (CRITICAL):

### 1. Direct Count (confidence 0.85-1.0)
- Count EACH visible item individually
- If stacked: count visible rows × estimated depth
- Always write: "X items visible" or "X rows × Y deep"

### 2. Package Size Estimation (confidence 0.7-0.95)
- READ labels carefully for weight/volume (e.g., "5kg", "1L")
- Calculate: number of packages × size per package
- Example: "2 bags × 5kg = 10kg total"

### 3. Visual Volume Estimation (confidence 0.5-0.8)
- For containers: estimate fill level (e.g., "half full", "3/4 full")
- Container volume × fill level = actual quantity
- Reference: 1L container ≈ 500-800g for chopped vegetables

### 4. Partial Visibility (confidence 0.3-0.6)
- Only count what you can SEE, don't guess hidden items
- If stacked behind: count visible row as MINIMUM
- Mark as "minimum X, likely more"

${multiImageInstructions}
# Examples
${FEW_SHOT_EXAMPLES}

# DON'T (IMPORTANT):
- DON'T guess quantities without evidence - be conservative
- DON'T assume standard package sizes without seeing labels
- DON'T count the same item twice from different angles
- DON'T return quantity as 0 (skip the item instead)
- DON'T include non-food items unless kitchen supplies
- DON'T add any text outside the JSON format
- DON'T forget to show your calculation in notes

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
