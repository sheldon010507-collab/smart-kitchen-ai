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
  // Container fields (for container-aware scanning)
  container_id?: string;
  container_name?: string;
  container_capacity?: string;  // e.g., "6 L"
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
 * Generate prompt for multi-angle image scanning
 * Optimized for analyzing multiple photos of the same area from different angles
 */
export function generateMultiAngleScanPrompt(options: PromptOptions): string {
  const { imageCount, scanArea, knownItems } = options;

  const knownItemsList = knownItems.length > 0
    ? knownItems.slice(0, 15).map(i => `${i.name}(${i.unit})`).join(', ')
    : 'identify all food items';

  return `
# Multi-Angle Inventory Scanner

You are analyzing ${imageCount} photos of the SAME ${AREA_DESCRIPTIONS[scanArea]} from DIFFERENT ANGLES.

## CRITICAL: Multi-Angle Fusion Rules
- Image 1 might be FRONT view (labels, brands visible)
- Image 2 might be SIDE view (see depth, stacking)
- Image 3 might be TOP/OTHER view (see hidden items)

Your task: COMBINE information from ALL angles to get ACCURATE count.

### Counting Strategy:
1. First, identify items visible in EACH image
2. Match same items across images by position/appearance
3. Use SIDE view to determine depth (e.g., "3 bottles deep")
4. Use FRONT view for labels and identification
5. Final count = visible front × depth (if side view confirms)

### Handling Partial Visibility:
- If item is partially hidden, estimate based on visible portion
- Mark hidden/estimated items with lower confidence (0.5-0.7)
- If all images show same angle, note "depth unknown" in notes

### Example:
- Front view: 4 milk bottles visible
- Side view: bottles are 2 deep
- Correct count: 4 × 2 = 8 bottles

## Known Items (prefer matching)
${knownItemsList}

## Output (JSON only)
{
  "items": [
    {
      "name": "Item name",
      "quantity": number,
      "unit": "${ALLOWED_UNITS.join('/')}",
      "confidence": 0.0-1.0,
      "notes": "front:X × depth:Y = total"
    }
  ],
  "scan_quality": "good/medium/poor"
}

## DON'T
- Don't count same item multiple times across angles
- Don't guess depth without side view evidence
- Don't ignore any image
- Don't return quantity 0 (skip item instead)

Analyze all ${imageCount} images now:`.trim();
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
  // Container matching fields (for fridge scans with registered containers)
  container_match?: string;  // Container ID if recognized
  container_name?: string;   // Container name if recognized
  fill_level?: 'full' | 'medium' | 'low' | 'empty';  // Estimated fill level
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

// ===================
// FRIDGE AUDIT FUNCTIONS
// ===================

import type { DictionaryItem, FridgeAuditResult } from '../types';

/**
 * Generate Fridge Audit prompt for inventory reconciliation
 * 🆕 Enhanced with label reading (OCR) capabilities
 * Returns found items, not_found items, and new items
 */
export function generateFridgeAuditPrompt(options: {
  imageCount: number;
  dictionary: DictionaryItem[];
}): string {
  const { imageCount, dictionary } = options;

  const dictList = dictionary.length > 0
    ? dictionary.map(i => `${i.name}(${i.unit})`).join(', ')
    : '(no known items)';

  const multiNote = imageCount > 1
    ? `\n⚠️ ${imageCount} photos of SAME fridge - count items ONCE by combining all views.`
    : '';

  return `
# Fridge Inventory Audit with Label Reading${multiNote}

## Known Items (MATCH these names exactly):
${dictList}

## Task
1. Count ACTUAL visible quantities for each item
2. Use exact names from known items when matching
3. **🔍 READ LABELS** - extract weight, brand, and expiry if visible
4. Report NEW items not in the known list
5. Report items from known list that are NOT visible

## 🔍 LABEL READING RULES (IMPORTANT!)
When you see packages, containers, or bottles:
1. **Read the WEIGHT/VOLUME** from the label (e.g., "500g", "1L", "2kg")
2. **Read the BRAND NAME** if visible
3. **Read EXPIRY DATE** if visible (format: YYYY-MM-DD)
4. Use label info to improve quantity accuracy:
   - "3 bottles × 500ml each" → quantity: 1.5, unit: L
   - "2 bags × 1kg each" → quantity: 2, unit: kg

## Output JSON (strict format)
{
  "found": [{
    "name": "exact name",
    "quantity": num,
    "unit": "str",
    "confidence": 0-1,
    "label_weight": "500g (if read from label)",
    "brand": "Brand name (if visible)",
    "expiry": "YYYY-MM-DD (if visible)",
    "notes": "how counted"
  }],
  "not_found": ["names of known items not visible in any photo"],
  "new_items": [{
    "name": "descriptive name with brand if visible",
    "quantity": num,
    "unit": "str",
    "confidence": 0-1,
    "label_weight": "from label if visible",
    "brand": "if visible"
  }],
  "scan_quality": "good/medium/poor"
}

## Examples
Reading labels:
{"found":[{"name":"Milk","quantity":2,"unit":"L","confidence":0.95,"label_weight":"1L each","brand":"Anchor","notes":"2 bottles × 1L"}],"scan_quality":"good"}

New item with brand:
{"new_items":[{"name":"Orange Juice","quantity":1.5,"unit":"L","confidence":0.8,"brand":"Tropicana","label_weight":"1.5L"}],"scan_quality":"good"}

## Rules
- found: items that ARE visible and match known list
- not_found: items from known list that you CANNOT see
- new_items: visible items NOT in the known list
- Don't guess hidden quantities
- **ALWAYS try to read labels for accurate weight/volume**

Analyze:`.trim();
}

/**
 * Parse and validate Fridge Audit result from AI
 */
export function validateFridgeAuditResult(raw: string): FridgeAuditResult | null {
  try {
    // Clean JSON markers
    let cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Extract JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const data = JSON.parse(cleaned);

    // Validate and filter found items
    const found = (data.found || [])
      .filter((i: any) =>
        typeof i.name === 'string' &&
        i.name.length > 0 &&
        typeof i.quantity === 'number' &&
        i.quantity >= 0
      )
      .map((i: any) => ({
        name: i.name.trim(),
        quantity: Math.round(i.quantity * 100) / 100,
        unit: (i.unit || 'pcs').trim(),
        confidence: typeof i.confidence === 'number' ? Math.min(1, Math.max(0, i.confidence)) : 0.7,
        notes: i.notes,
      }));

    // Validate not_found (array of strings)
    const notFound = (data.not_found || [])
      .filter((name: any) => typeof name === 'string' && name.length > 0)
      .map((name: any) => name.trim());

    // Validate new_items
    const newItems = (data.new_items || [])
      .filter((i: any) =>
        typeof i.name === 'string' &&
        i.name.length > 0 &&
        typeof i.quantity === 'number' &&
        i.quantity > 0
      )
      .map((i: any) => ({
        name: i.name.trim(),
        quantity: Math.round(i.quantity * 100) / 100,
        unit: (i.unit || 'pcs').trim(),
        confidence: typeof i.confidence === 'number' ? Math.min(1, Math.max(0, i.confidence)) : 0.6,
      }));

    return {
      found,
      notFound,
      newItems,
      scanQuality: ['good', 'medium', 'poor'].includes(data.scan_quality)
        ? data.scan_quality
        : 'medium',
    };
  } catch (e) {
    console.error('Failed to parse fridge audit result:', e);
    return null;
  }
}

/**
 * Container info for AI prompt
 */
export interface ContainerInfo {
  id: string;
  name: string;
  capacity: string;  // e.g., "6 L"
  imageUrl?: string;
}

/**
 * Generate container-aware fridge scan prompt
 * Includes registered containers for matching and fill level estimation
 */
export function generateContainerScanPrompt(
  imageCount: number,
  containers: ContainerInfo[],
  knownItems: KnownItem[] = []
): string {
  // Build container reference list
  const containerList = containers.length > 0
    ? containers.map(c => `- "${c.name}" (${c.capacity})`).join('\n')
    : '(No registered containers)';

  const knownItemsList = knownItems.slice(0, 10).map(i => `${i.name}(${i.unit})`).join(', ');

  return `
# Fridge Inventory Scanner with Container Recognition

## Task
Analyze ${imageCount} image(s) of refrigerator contents. For EACH item:
1. Identify the item
2. If in a container, match to registered containers below
3. Estimate fill level (full/medium/low/empty)

## Registered Containers
${containerList}

## Fill Level Definitions
- full: >75% capacity
- medium: 25-75% capacity  
- low: 10-25% capacity
- empty: <10% capacity

## Known Items
${knownItemsList || 'identify all food items'}

## Output Format (JSON only)
{
  "items": [
    {
      "name": "Item name",
      "quantity": number,
      "unit": "kg/L/pcs/box",
      "confidence": 0.0-1.0,
      "container_name": "Red Lid Box or null if not in container",
      "fill_level": "full/medium/low/empty or null if loose item",
      "notes": "how estimated"
    }
  ],
  "scan_quality": "good/medium/poor"
}

## Examples
Container in fridge:
{"items":[{"name":"Beef broth","quantity":4.5,"unit":"L","confidence":0.8,"container_name":"Red Lid Box","fill_level":"medium","notes":"6L container ~75% full"}],"scan_quality":"good"}

Loose items:
{"items":[{"name":"Eggs","quantity":12,"unit":"pcs","confidence":0.95,"container_name":null,"fill_level":null,"notes":"one carton visible"}],"scan_quality":"good"}

Analyze now:`.trim();
}

// ===================
// INVOICE/RECEIPT OCR FUNCTIONS
// ===================

/**
 * Invoice scan result item with cost information
 */
export interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalPrice: number;
  confidence: number;
  notes?: string;
}

/**
 * Full invoice scan result
 */
export interface InvoiceScanResult {
  supplier?: string;
  invoiceNumber?: string;
  date?: string;
  items: InvoiceItem[];
  subtotal?: number;
  tax?: number;
  grandTotal?: number;
  scanQuality: 'good' | 'medium' | 'poor';
}

/**
 * Generate prompt for scanning supplier invoices/delivery notes
 * Optimized for OCR text extraction with cost information
 */
export function generateInvoiceScanPrompt(knownItems: string[] = []): string {
  const knownItemsList = knownItems.length > 0
    ? `Known items (prefer matching these names): ${knownItems.slice(0, 20).join(', ')}`
    : '';

  return `
# Supplier Invoice/Delivery Note Scanner

## Task
Analyze this invoice/delivery note image and extract ALL information.

## Extract These Fields:
1. **Supplier Name** (company/vendor name at top of document)
2. **Invoice/Order Number** (reference number)
3. **Date** (delivery or invoice date)
4. **Line Items** - for EACH item extract:
   - Item Name (product description)
   - Quantity (number ordered)
   - Unit (kg/box/pcs/bottle/case/pack/bag/L/ml)
   - Unit Cost (price per unit)
   - Total Price (quantity × unit cost)

${knownItemsList}

## Output Format (JSON only, no other text)
{
  "supplier": "Supplier Company Name",
  "invoiceNumber": "INV-12345",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "Item name",
      "quantity": 10,
      "unit": "kg/box/pcs/bottle/case",
      "unitCost": 5.99,
      "totalPrice": 59.90,
      "confidence": 0.0-1.0,
      "notes": "optional - if text unclear"
    }
  ],
  "subtotal": 100.00,
  "tax": 10.00,
  "grandTotal": 110.00,
  "scanQuality": "good/medium/poor"
}

## Rules
1. READ text carefully - this is OCR, not visual counting
2. If unit cost missing, calculate from total ÷ quantity
3. If total missing, calculate from unit cost × quantity
4. Use confidence < 0.8 for blurry or unclear text
5. Supplier name is usually at TOP of document (company logo area)
6. Look for "Bill To" vs "Ship From" - we want the SUPPLIER (ship from)

## Examples
Clean invoice:
{"supplier":"Sysco Foods","invoiceNumber":"INV-2024-001","date":"2024-01-15","items":[{"name":"Fresh Salmon","quantity":5,"unit":"kg","unitCost":25.00,"totalPrice":125.00,"confidence":0.95}],"subtotal":125.00,"tax":12.50,"grandTotal":137.50,"scanQuality":"good"}

Partial visibility:
{"supplier":"Gordon Food Service","invoiceNumber":"ORD-789","date":"2024-01-10","items":[{"name":"Chicken Breast","quantity":10,"unit":"kg","unitCost":8.50,"totalPrice":85.00,"confidence":0.7,"notes":"price partially obscured"}],"scanQuality":"medium"}

Analyze now:`.trim();
}

/**
 * Parse and validate invoice scan result from AI
 */
export function validateInvoiceScanResult(raw: string): InvoiceScanResult | null {
  try {
    // Clean JSON markers
    let cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Extract JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const data = JSON.parse(cleaned);

    // Validate items array
    const items: InvoiceItem[] = (data.items || [])
      .filter((i: any) =>
        typeof i.name === 'string' &&
        i.name.length > 0 &&
        typeof i.quantity === 'number' &&
        i.quantity > 0
      )
      .map((i: any) => ({
        name: i.name.trim(),
        quantity: Math.round(i.quantity * 100) / 100,
        unit: (i.unit || 'pcs').trim(),
        unitCost: typeof i.unitCost === 'number' ? Math.round(i.unitCost * 100) / 100 : 0,
        totalPrice: typeof i.totalPrice === 'number' ? Math.round(i.totalPrice * 100) / 100 : 0,
        confidence: typeof i.confidence === 'number' ? Math.min(1, Math.max(0, i.confidence)) : 0.7,
        notes: i.notes,
      }));

    return {
      supplier: typeof data.supplier === 'string' ? data.supplier.trim() : undefined,
      invoiceNumber: typeof data.invoiceNumber === 'string' ? data.invoiceNumber.trim() : undefined,
      date: typeof data.date === 'string' ? data.date.trim() : undefined,
      items,
      subtotal: typeof data.subtotal === 'number' ? data.subtotal : undefined,
      tax: typeof data.tax === 'number' ? data.tax : undefined,
      grandTotal: typeof data.grandTotal === 'number' ? data.grandTotal : undefined,
      scanQuality: ['good', 'medium', 'poor'].includes(data.scanQuality)
        ? data.scanQuality
        : 'medium',
    };
  } catch (e) {
    console.error('Failed to parse invoice scan result:', e);
    return null;
  }
}


