export interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalPrice: number;
  confidence: number;
  notes?: string;
}

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

export function sanitizeKnownItems(knownItems: string[]): string[] {
  return knownItems
    .map(name => name.replace(/[<>{}[\]\\|`~!@#$%^&*()=+;:'"]/g, '').slice(0, 50).trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function generateInvoiceScanPrompt(knownItems: string[] = []): string {
  const knownItemsList = knownItems.length > 0
    ? `Known items, prefer matching these names: ${knownItems.slice(0, 20).join(', ')}`
    : '';

  return `
# Supplier Invoice or Receipt Scanner

Read the document as OCR. Extract supplier, invoice/order number, date, and every line item.

${knownItemsList}

Return JSON only:
{
  "supplier": "Supplier Company",
  "invoiceNumber": "INV-123",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "Item name",
      "quantity": 10,
      "unit": "kg/box/pcs/bottle/case/pack/bag/L/ml",
      "unitCost": 5.99,
      "totalPrice": 59.90,
      "confidence": 0.0,
      "notes": "optional"
    }
  ],
  "subtotal": 100.00,
  "tax": 10.00,
  "grandTotal": 110.00,
  "scanQuality": "good/medium/poor"
}

Rules:
1. Read text carefully; use only the receipt or invoice document text.
2. If unit cost is missing, calculate totalPrice / quantity.
3. If total is missing, calculate unitCost * quantity.
4. Use confidence below 0.8 for blurry or unclear text.
5. Supplier is usually the selling company, not the buyer.
`.trim();
}

export function buildMultiInvoicePrompt(basePrompt: string, imageCount: number): string {
  return `
${basePrompt}

IMPORTANT: You are analyzing ${imageCount} receipt/invoice photos.
- They may be different receipts or pages of the same receipt.
- Combine all line items into one list.
- If the same item appears more than once, combine quantities when safe.
- Extract supplier from the clearest page.
`.trim();
}

export function validateInvoiceScanResult(raw: string): InvoiceScanResult | null {
  let cleaned = '';
  try {
    cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    cleaned = cleaned.replace(/(\d+)\.(\d{5,})/g, (_, intPart, decPart) => {
      const n = parseFloat(`${intPart}.${decPart}`);
      return Number.isFinite(n) ? String(Number(n.toFixed(4))) : `${intPart}.0`;
    });

    const firstOpen = cleaned.indexOf('{');
    const lastClose = cleaned.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      cleaned = cleaned.substring(firstOpen, lastClose + 1);
    } else if (firstOpen !== -1) {
      cleaned = `${cleaned.substring(firstOpen)}}`;
    }

    return normalizeInvoiceData(JSON.parse(cleaned));
  } catch (error) {
    const repaired = tryRepairTruncatedInvoice(cleaned);
    if (repaired) return repaired;
    console.error('Failed to parse invoice scan result:', error);
    return null;
  }
}

function normalizeInvoiceData(data: any): InvoiceScanResult {
  const items: InvoiceItem[] = (data.items || [])
    .filter((item: any) => typeof item.name === 'string' && item.name.trim() && Number(item.quantity) > 0)
    .map((item: any) => ({
      name: item.name.trim(),
      quantity: roundMoney(Number(item.quantity)),
      unit: String(item.unit || 'pcs').trim(),
      unitCost: typeof item.unitCost === 'number' ? roundMoney(item.unitCost) : 0,
      totalPrice: typeof item.totalPrice === 'number' ? roundMoney(item.totalPrice) : 0,
      confidence: typeof item.confidence === 'number' ? Math.min(1, Math.max(0, item.confidence)) : 0.7,
      notes: item.notes,
    }));

  return {
    supplier: typeof data.supplier === 'string' ? data.supplier.trim() : undefined,
    invoiceNumber: typeof data.invoiceNumber === 'string' ? data.invoiceNumber.trim() : undefined,
    date: typeof data.date === 'string' ? data.date.trim() : undefined,
    items,
    subtotal: typeof data.subtotal === 'number' ? data.subtotal : undefined,
    tax: typeof data.tax === 'number' ? data.tax : undefined,
    grandTotal: typeof data.grandTotal === 'number' ? data.grandTotal : undefined,
    scanQuality: ['good', 'medium', 'poor'].includes(data.scanQuality) ? data.scanQuality : 'medium',
  };
}

function tryRepairTruncatedInvoice(cleaned: string): InvoiceScanResult | null {
  if (!cleaned) return null;
  try {
    const repaired = cleaned.replace(/\s*$/, '').replace(/,\s*$/, '');
    return normalizeInvoiceData(JSON.parse(repaired.endsWith('}') ? repaired : `${repaired}]}`));
  } catch {
    return null;
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
