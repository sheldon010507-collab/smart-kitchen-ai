import { describe, expect, it } from 'vitest';
import { generateInvoiceScanPrompt, validateInvoiceScanResult } from '../../services/invoiceVision';

describe('invoice vision helpers', () => {
  it('keeps receipt OCR separate from removed fridge inventory scanning', () => {
    const prompt = generateInvoiceScanPrompt(['Whole Milk']);

    expect(prompt).toContain('Supplier Invoice or Receipt Scanner');
    expect(prompt).toContain('Whole Milk');
    expect(prompt.toLowerCase()).not.toContain('fridge');
    expect(prompt.toLowerCase()).not.toContain('shelf');
  });

  it('parses invoice OCR JSON and rounds noisy numeric fields', () => {
    const result = validateInvoiceScanResult(`\`\`\`json
{
  "supplier": "Booker",
  "items": [
    {"name": "Milk", "quantity": 2, "unit": "L", "unitCost": 1.23456789, "totalPrice": 2.46999999, "confidence": 0.9}
  ],
  "scanQuality": "good"
}
\`\`\``);

    expect(result).toMatchObject({
      supplier: 'Booker',
      scanQuality: 'good',
      items: [{ name: 'Milk', quantity: 2, unit: 'L', unitCost: 1.23, totalPrice: 2.47 }],
    });
  });
});
