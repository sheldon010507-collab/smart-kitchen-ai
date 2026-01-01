/**
 * Optimized Prompt Templates for Inventory Scanning v2.0
 * 
 * Optimizations:
 * 1. Reduced from ~4500 chars to ~1800 chars
 * 2. 4 examples instead of 10
 * 3. Removed verbose package size reference
 * 4. Streamlined rules
 * 5. Added timeout-friendly quick version
 * 6. Smart prompt selector based on context
 */

export interface KnownItem {
  id?: string;
  name: string;
  unit: string;
  category?: string;
  typical_quantity?: string;
  typical_package_size?: string;
  visual_description?: string;
  aliases?: string[];
}

export type ScanAreaType = 'storage' | 'prep' | 'fridge';
export type LanguageType = 'en' | 'zh';

export interface PromptOptions {
  imageCount: number;
  scanArea: ScanAreaType;
  knownItems: KnownItem[];
  language?: LanguageType;
}

// Area descriptions (simplified)
const AREA_DESCRIPTIONS: Record<ScanAreaType, string> = {
  storage: 'dry storage with shelves',
  prep: 'prep station with containers',
  fridge: 'refrigerator/cold storage'
};

const ALLOWED_UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'box', 'bag', 'bottle', 'pack', 'bunch'];

// Reduced to 4 key examples
const FEW_SHOT_EXAMPLES = `
[Direct count]
{"items":[{"name":"Tofu","quantity":3,"unit":"box","confidence":0.95,"notes":"3 boxes visible"}],"scan_quality":"good"}

[Package calculation]
{"items":[{"name":"Rice","quantity":10,"unit":"kg","confidence":0.9,"notes":"2 bags × 5kg"}],"scan_quality":"good"}

[Partial visibility]
{"items":[{"name":"Eggs","quantity":30,"unit":"pcs","confidence":0.6,"notes":"1 tray visible, depth unknown"}],"scan_quality":"medium"}

[Multiple items]
{"items":[{"name":"Oil","quantity":5,"unit":"bottle","confidence":0.9},{"name":"Cans","quantity":6,"unit":"pcs","confidence":0.7,"notes":"front row only"}],"scan_quality":"medium"}
`;

/**
 * Generate optimized scan prompt (v2.0 - ~1800 chars)
 */
export function generateScanPrompt(options: PromptOptions): string {
  const { imageCount, scanArea, knownItems } = options;

  // Build compact known items list
  const knownItemsList = knownItems.length > 0
    ? knownItems.slice(0, 20).map(item => `${item.name}(${item.unit})`).join(', ')
    : 'identify all visible food items';

  const multiImageWarning = imageCount > 1
    ? `\n⚠️ ${imageCount} images of SAME area - count each item ONCE only!`
    : '';

  return `
# Restaurant Inventory Scanner
Count food items in ${AREA_DESCRIPTIONS[scanArea]}.${multiImageWarning}

## Known Items
${knownItemsList}

## Rules
1. COUNT visible items only - never guess hidden quantities
2. READ labels for weight/volume when visible
3. For stacks: count front row, note uncertainty
4. Confidence: 0.9+=clear, 0.7-0.9=partial, <0.7=uncertain

## Output (JSON only, no other text)
{"items":[{"name":"str","quantity":num,"unit":"${ALLOWED_UNITS.join('/')}","confidence":0-1,"notes":"how counted"}],"scan_quality":"good/medium/poor"}

## Examples
${FEW_SHOT_EXAMPLES}

Analyze now:`.trim();
}

/**
 * Ultra-fast prompt for quick scans (~300 chars)
 */
export function generateQuickScanPrompt(
  imageCount: number,
  knownItemNames: string[] = []
): string {
  const itemHint = knownItemNames.length > 0
    ? `Match if possible: ${knownItemNames.slice(0, 10).join(', ')}\n`
    : '';

  return `
Count food items.${imageCount > 1 ? ` ${imageCount} images = SAME area, count once.` : ''}
${itemHint}
JSON only: {"items":[{"name":"str","quantity":num,"unit":"pcs/kg/box/bag/bottle","confidence":0-1}],"scan_quality":"good/medium/poor"}
`.trim();
}

/**
 * Detailed prompt for complex scenes (~2500 chars)
 * Use only when quick scan fails or returns low confidence
 */
export function generateDetailedScanPrompt(options: PromptOptions): string {
  const { imageCount, scanArea, knownItems } = options;

  const knownItemsList = knownItems.length > 0
    ? knownItems.map(item => {
      let entry = `- ${item.name} (${item.unit})`;
      if (item.visual_description) entry += ` [${item.visual_description}]`;
      return entry;
    }).join('\n')
    : '- Identify all visible food items';

  const multiImageRules = imageCount > 1 ? `
## Multi-Image Rules (CRITICAL)
- These ${imageCount} images show SAME area from different angles
- Count each item ONLY ONCE across all images
- Use clearest view for quantity determination
- Higher confidence for items seen in multiple images
` : '';

  return `
# Expert Restaurant Inventory Scanner

## Task
Analyze ${imageCount} image${imageCount > 1 ? 's' : ''} of ${AREA_DESCRIPTIONS[scanArea]} and count all food items.
${multiImageRules}

## Known Items (prioritize matching)
${knownItemsList}

## Counting Method
1. **Direct Count** (confidence 0.85-1.0): Count each visible item
2. **Label Reading** (confidence 0.7-0.95): Read weight/volume from labels, calculate total
3. **Partial Visibility** (confidence 0.5-0.7): Count visible only, note "more may be behind"
4. **Estimation** (confidence 0.3-0.5): Only when necessary, be conservative

## Output Format
\`\`\`json
{
  "items": [
    {"name": "Item name", "quantity": number, "unit": "${ALLOWED_UNITS.join('/')}", "confidence": 0.0-1.0, "notes": "counting method"}
  ],
  "scan_quality": "good/medium/poor",
  "suggestions": ["optional improvements"]
}
\`\`\`

## DON'T
- Don't guess hidden quantities
- Don't double count across images
- Don't return quantity 0 (skip instead)
- Don't add text outside JSON

## Examples
${FEW_SHOT_EXAMPLES}

Analyze the image(s) now:`.trim();
}

/**
 * Validate and parse AI scan result
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
    // Clean JSON markers and extra text
    let cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Extract JSON if wrapped in other text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

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
        typeof item.unit === 'string'
      )
      .map((item: any) => ({
        name: item.name.trim(),
        quantity: Math.round(item.quantity * 100) / 100,
        unit: item.unit.trim().toLowerCase(),
        confidence: typeof item.confidence === 'number'
          ? Math.min(1, Math.max(0, Math.round(item.confidence * 100) / 100))
          : 0.7,
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

/**
 * Smart prompt selector based on context
 */
export function selectPrompt(options: PromptOptions & {
  isRetry?: boolean;
  previousConfidence?: number;
}): string {
  const { isRetry, previousConfidence, imageCount, knownItems } = options;

  // Use detailed prompt for retries or low confidence results
  if (isRetry || (previousConfidence !== undefined && previousConfidence < 0.6)) {
    return generateDetailedScanPrompt(options);
  }

  // Use standard prompt if many known items (quick prompt would be too long)
  if (knownItems.length > 15) {
    return generateScanPrompt(options);
  }

  // Use quick prompt for simple cases
  if (imageCount === 1 && knownItems.length <= 5) {
    return generateQuickScanPrompt(imageCount, knownItems.map(i => i.name));
  }

  // Default to standard optimized prompt
  return generateScanPrompt(options);
}
