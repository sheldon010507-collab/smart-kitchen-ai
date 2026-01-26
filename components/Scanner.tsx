import React, { useEffect, useMemo, useState } from "react";
import { X, UploadCloud, Loader2, Wand2, Trash2, Camera, Plus, ShoppingCart, ChefHat, AlertTriangle, Minus } from "lucide-react";
import type { InventoryItem } from "../types";
import { analyzeInventoryImage, analyzeMultiAngleImages, analyzeFridgeAudit, analyzeInvoice } from "../services/geminiService";
import { getSmartDictionary } from "../features/inventory-scan/services/dictionaryService";
import type { DictionaryItem, FridgeAuditResult } from "../features/inventory-scan/types";
import { preprocessImage } from "../features/inventory-scan/utils/imagePreprocessing";
import { generateScanPrompt, ALLOWED_CATEGORIES } from "../features/inventory-scan/services/promptTemplates";
import { calculateRequirements, formatRequirements } from "../features/inventory-scan/utils/calculateRequirements";
import { saveScanCorrection } from "../features/inventory-scan/services/scanCorrectionService";
import AddItemQuickForm from "../features/inventory-scan/components/AddItemQuickForm";
import { normalizeNumber, normalizeDDMMYYYY, uniq, topMatches } from "../utils/formatters";
import { predictExpiryDateBatch } from "../utils/predictExpiryDate";
import { supabase } from "../lib/supabase";

type ScanMode = "receipt" | "fridge";

type ReviewItem = InventoryItem & {
  confidence?: number; // 0~1
  candidates?: string[];
  is_new_item?: boolean;
  raw_name?: string;
  flags?: string[];
  originalQuantity?: number;  // Track original for correction logging
  isManuallyAdded?: boolean;  // Track if item was manually added
};

interface Props {
  initialMode: ScanMode;
  onClose: () => void;
  // 🆕 pass mode for proper inventory update
  onItemsFound: (items: InventoryItem[], mode?: 'cumulative' | 'stocktake') => void;
  inventoryNameOptions?: string[]; // RAG: existing ingredient dictionary
}



// ✅ Issue 15 Fix: Removed local fileToBase64 to prevent memory issues.
// We now use URL.createObjectURL for preview and preprocessImage for API calls.

function cleanupUrl(url: string) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

// ✅ 更健壮的 JSON 提取函数


// ✅ 工具函數已統一至 utils/formatters.ts

// Validation limits - extracted as constants for maintainability
const VALIDATION_LIMITS = {
  MAX_QUANTITY: 200,
  MAX_UNIT_COST: 1000,
  MAX_TOTAL_PRICE: 5000,
} as const;

function validateAndFlagItems(items: ReviewItem[]) {
  return items.map((it) => {
    const flags: string[] = [];
    const qty = normalizeNumber((it as any).quantityValue, 1);
    const unitCost = normalizeNumber((it as any).unitCost, 0);
    const total = normalizeNumber((it as any).totalPrice ?? (it as any).total_price, 0);

    if (qty > VALIDATION_LIMITS.MAX_QUANTITY) flags.push("Quantity too large");
    if (unitCost > VALIDATION_LIMITS.MAX_UNIT_COST) flags.push("Unit cost too high");
    if (total > VALIDATION_LIMITS.MAX_TOTAL_PRICE) flags.push("Total price too high");

    return { ...it, flags };
  });
}

// Default shelf life by category (days)
const CATEGORY_SHELF_LIFE: Record<string, number> = {
  dairy: 7, produce: 5, meat: 3, seafood: 2, fresh: 5,
  frozen: 90, 'dry goods': 180, beverages: 30, condiments: 90, bakery: 3
};

function getDefaultExpiry(category: string): string {
  const lowerCat = category.toLowerCase();
  let days = 7; // default
  for (const [key, d] of Object.entries(CATEGORY_SHELF_LIFE)) {
    if (lowerCat.includes(key)) { days = d; break; }
  }
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// ✅ Map raw AI items to ReviewItem format
function mapRawItems(rawItems: any[]): ReviewItem[] {
  return rawItems.map((x: any, idx: number) => {
    const qv = normalizeNumber(x.quantityValue ?? x.quantity_value ?? x.quantity, 1);
    const qu = String(x.quantityUnit ?? x.quantity_unit ?? x.unit ?? "pcs");
    const unitCost = normalizeNumber(x.unitCost ?? x.unit_cost, 0);
    const total = normalizeNumber(x.totalPrice ?? x.total_price, 0);

    const name = String(x.name || "").trim();
    const category = String(x.category || "");
    const location = String(x.location || "");

    // ✅ Smart expiry: use AI result or calculate from category
    let expiry = normalizeDDMMYYYY(x.expiryDate ?? x.expiry_date);
    if (!expiry || expiry.length < 8) {
      expiry = getDefaultExpiry(category);
    }

    const confidence = normalizeNumber(x.confidence, 0.8);
    const isNew = x.is_new_item === true;

    return {
      id: `${Date.now()}_${idx}`,
      name,
      quantityValue: qv,
      quantityUnit: qu,
      quantity: `${qv} ${qu}`,
      unitCost,
      totalPrice: total,
      expiryDate: expiry,
      category,
      location,
      confidence,
      candidates: Array.isArray(x.candidates) ? x.candidates : [],
      is_new_item: isNew,
      flags: [],
      raw_name: name
    } as unknown as ReviewItem;
  });
}


const Scanner: React.FC<Props> = ({
  initialMode,
  onClose,
  onItemsFound,
  inventoryNameOptions = [],
}) => {
  const [mode, setMode] = useState<ScanMode>(initialMode);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState<"upload" | "review" | "calculate">("upload");
  const [error, setError] = useState<string>("");
  const [rawOutput, setRawOutput] = useState<string>(""); // ✅ 保存原始输出用于调试
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);  // For adding missed items

  // ✅ Multi-photo support for fridge mode
  const [fridgePhotos, setFridgePhotos] = useState<Array<{ file: File; preview: string }>>([]);
  const [calculationResult, setCalculationResult] = useState<string | null>(null);

  // 🆕 Fridge Audit state
  const [dictionaryItems, setDictionaryItems] = useState<DictionaryItem[]>([]);
  const [auditResult, setAuditResult] = useState<FridgeAuditResult | null>(null);
  const [notSeenAction, setNotSeenAction] = useState<Record<string, 'keep' | 'zero'>>({});

  const dictionary = useMemo(() => dictionaryItems.length > 0
    ? dictionaryItems.map(d => d.name)
    : uniq(inventoryNameOptions), [dictionaryItems, inventoryNameOptions]);

  useEffect(() => {
    // Cleanup old preview
    if (previewUrl) cleanupUrl(previewUrl);

    setMode(initialMode);
    setFile(null);
    setPreviewUrl("");
    setError("");
    setRawOutput("");
    setStep("upload");
    setReviewItems([]);
    setFridgePhotos(prev => {
      // Cleanup photos
      prev.forEach(p => cleanupUrl(p.preview));
      return [];
    });
    setCalculationResult(null);
  }, [initialMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) cleanupUrl(previewUrl);
      fridgePhotos.forEach(p => cleanupUrl(p.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isReceiptLike = mode === "receipt" || mode === "fridge";

  const suggestionsFor = (name: string, candidates?: string[]) => {
    const a = candidates ?? [];
    const b = topMatches(name, dictionary, 8);
    return uniq([...a, ...b]).slice(0, 10);
  };

  const handleChoose = (f: File) => {
    setError("");
    setRawOutput("");

    // Cleanup previous
    if (previewUrl) cleanupUrl(previewUrl);

    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  // ✅ Multi-photo handlers for fridge mode
  const addFridgePhoto = async (f: File) => {
    if (fridgePhotos.length >= 5) {
      setError("Maximum 5 photos allowed");
      return;
    }
    const url = URL.createObjectURL(f);
    setFridgePhotos(prev => [...prev, { file: f, preview: url }]);
    setError("");
  };

  const removeFridgePhoto = (index: number) => {
    setFridgePhotos(prev => {
      const target = prev[index];
      if (target) cleanupUrl(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const runAI = async () => {
    // For fridge mode, check multi-photo or single file
    if (mode === "fridge" && fridgePhotos.length === 0 && !file) {
      setError("Please add at least one photo.");
      return;
    }
    if (mode !== "fridge" && !file) {
      setError("Please choose an image first.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setRawOutput("");

    try {
      // Mode: Receipt - 🆕 Use Invoice OCR for accurate supplier/cost extraction
      if (mode === "receipt") {
        const processed = await preprocessImage(file!, {
          targetSizeKB: 300,   // Higher quality for OCR text
          maxWidth: 1500,      // Keep good resolution for text
          autoEnhance: true
        });

        // 🆕 Use new invoice analyzer with supplier/cost extraction
        const invoiceResult = await analyzeInvoice(processed.base64, 'image/jpeg', dictionary);

        if (!invoiceResult.items || invoiceResult.items.length === 0) {
          throw new Error("No items found. Please try a clearer photo.");
        }

        // Log supplier if detected
        if (invoiceResult.supplier) {
          console.log(`[Scanner] Detected supplier: ${invoiceResult.supplier}`);
        }

        // Map invoice items to ReviewItem format with cost data
        const mappedItems = invoiceResult.items.map((item, idx) => ({
          id: `${Date.now()}_${idx}`,
          businessId: '',
          name: item.name,
          quantityValue: item.quantity,
          quantityUnit: item.unit,
          quantity: `${item.quantity} ${item.unit}`,
          unitCost: item.unitCost,
          totalPrice: item.totalPrice,
          expiryDate: getDefaultExpiry(''),
          category: '',
          location: '',
          addedDate: new Date().toISOString().split('T')[0],
          confidence: item.confidence,
          candidates: [],
          is_new_item: false,
          flags: [],
          raw_name: item.name,
          supplier: invoiceResult.supplier,  // Attach supplier to each item
        }));

        setReviewItems(validateAndFlagItems(mappedItems as ReviewItem[]));
        setStep("review");
        return;
      }

      // Mode: Fridge - multi-photo with preprocessing + Fridge Audit
      const photosToProcess = fridgePhotos.length > 0 ? fridgePhotos : [{ file: file!, preview: previewUrl }];

      // 🆕 Load smart dictionary for matching
      const businessId = (window as any).__currentBusinessId || '';
      const loadedDict = await getSmartDictionary(businessId, 30);
      setDictionaryItems(loadedDict);
      console.log(`[Scanner] Loaded ${loadedDict.length} dictionary items`);

      // Preprocess all images (optimized compression for multi-image scanning)
      const processedImages: Array<{ base64: string; mimeType: string }> = [];
      for (const photo of photosToProcess) {
        const processed = await preprocessImage(photo.file, {
          maxWidth: 800,       // Optimized for multi-image
          maxHeight: 600,
          targetSizeKB: 100,   // Each image ~100KB
          autoEnhance: true
        });
        processedImages.push({
          base64: processed.base64,
          mimeType: 'image/jpeg'
        });
      }

      console.log(`[Scanner] Fridge Audit: ${processedImages.length} images, ${loadedDict.length} known items`);

      // 🆕 Use Fridge Audit API
      const result = await analyzeFridgeAudit(processedImages, loadedDict);

      if (!result) {
        throw new Error("Failed to analyze images. Please try again.");
      }

      // Store audit result for UI
      setAuditResult(result);
      setNotSeenAction({}); // Reset actions

      // Combine found + new items for review
      const allItems = [
        ...result.found.map(item => ({
          ...item,
          isMatchedFromDict: true,
          dictItem: loadedDict.find(d => d.name === item.name),
        })),
        ...result.newItems.map(item => ({
          ...item,
          isMatchedFromDict: false,
          is_new_item: true,
        })),
      ];

      if (allItems.length === 0 && result.notFound.length === 0) {
        throw new Error("No items found. Please try clearer photos from different angles.");
      }

      // 🆕 Apply historical expiry date prediction
      let mappedItems = mapRawItems(allItems as any);
      try {
        const itemsForPrediction = mappedItems.map(item => ({
          name: item.name,
          category: item.category || null
        }));
        const expiryPredictions = await predictExpiryDateBatch(
          supabase,
          businessId,
          itemsForPrediction
        );
        // Apply predictions to items that don't have AI-detected expiry
        mappedItems = mappedItems.map(item => {
          const predicted = expiryPredictions.get(item.name);
          // Only use prediction if current expiry is just the default
          if (predicted && (!item.expiryDate || item.expiryDate === getDefaultExpiry(item.category))) {
            return { ...item, expiryDate: predicted, expirySource: 'history' as const };
          }
          return item;
        });
        console.log(`[Scanner] Applied ${expiryPredictions.size} historical expiry predictions`);
      } catch (e) {
        console.warn('[Scanner] Expiry prediction failed, using defaults:', e);
      }

      setReviewItems(validateAndFlagItems(mappedItems));
      setStep("review");

    } catch (e: any) {
      console.error("[runAI error]:", e);
      setError(e?.message || "Analyze failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const updateItem = (id: string, patch: Partial<ReviewItem>) => {
    setReviewItems((prev) =>
      prev.map((it) => (it.id === id ? validateAndFlagItems([{ ...it, ...patch }])[0] : it))
    );
  };

  const removeItem = (id: string) => setReviewItems((prev) => prev.filter((x) => x.id !== id));

  // Add missing item handler
  const addMissingItem = (item: { name: string; quantity: number; unit: string }) => {
    const newItem: ReviewItem = {
      id: `manual-${Date.now()}`,
      businessId: '',
      name: item.name,
      quantity: `${item.quantity} ${item.unit}`,
      quantityValue: item.quantity,
      quantityUnit: item.unit,
      category: '',
      location: '',
      expiryDate: '',
      addedDate: new Date().toISOString().split('T')[0],
      confidence: 1.0,
      isManuallyAdded: true,
    } as ReviewItem;
    setReviewItems(prev => [...prev, newItem]);
    setShowAddForm(false);
  };

  const confirm = () => {
    setError("");


    if (mode === "fridge") {
      // ✅ Fridge mode now also updates inventory (same as receipt)
      const cleaned = reviewItems
        .filter((x) => String(x.name || "").trim())
        .map((x) => {
          const qv = normalizeNumber((x as any).quantityValue, 1);
          const qu = String((x as any).quantityUnit || "pcs");
          return {
            ...x,
            name: String(x.name).trim(),
            quantityValue: qv,
            quantityUnit: qu,
            quantity: `${qv} ${qu}`,
            unitCost: 0, // Fridge scan typically doesn't have cost info
            totalPrice: 0,
            expiryDate: normalizeDDMMYYYY((x as any).expiryDate),
            category: String((x as any).category || 'Other'), // 🆕 Explicitly include category
          } as InventoryItem;
        });

      // 🆕 Add zero-quantity items for "not seen" items marked as "zero"
      const zeroItems: InventoryItem[] = [];
      Object.entries(notSeenAction).forEach(([name, action]) => {
        if (action === 'zero') {
          const dictItem = dictionaryItems.find(d => d.name === name);
          if (dictItem) {
            zeroItems.push({
              id: dictItem.id,
              businessId: '',
              name: dictItem.name,
              quantity: `0 ${dictItem.unit}`,
              quantityValue: 0,
              quantityUnit: dictItem.unit,
              unitCost: 0,
              category: dictItem.category || '',
              location: '',
              expiryDate: '',
              addedDate: new Date().toISOString().split('T')[0],
            });
          }
        }
      });

      // Combine scanned items with zero items
      const allUpdates = [...cleaned, ...zeroItems];

      // ✅ Save scan corrections (async, non-blocking)
      const imageUrls = fridgePhotos.map(p => p.preview);
      const originalItems = reviewItems
        .filter(it => !it.isManuallyAdded)
        .map(it => ({
          id: it.id,
          name: it.raw_name || it.name,
          quantity: it.originalQuantity ?? normalizeNumber((it as any).quantityValue, 1),
          unit: String((it as any).quantityUnit || 'pcs'),
          confidence: it.confidence || 0.6,
        }));
      const correctedItems = allUpdates.map(it => ({
        id: it.id,
        name: it.name,
        quantity: normalizeNumber((it as any).quantityValue, 0),
        unit: String((it as any).quantityUnit || 'pcs'),
        confidence: 1.0,
      }));
      saveScanCorrection(
        allUpdates[0]?.businessId || '',
        imageUrls,
        originalItems,
        correctedItems,
        'fridge'
      ).catch(err => console.warn('[ScanCorrection] Save failed:', err));

      console.log(`[Scanner] Fridge confirm: ${cleaned.length} scanned, ${zeroItems.length} zeroed`);
      // 🆕 Fridge scan = Stocktake (Overwrite quantity)
      onItemsFound(allUpdates, 'stocktake');
      onClose();
      return;
    }

    // receipt -> inventory in
    const cleaned = reviewItems
      .filter((x) => String(x.name || "").trim())
      .map((x) => {
        const qv = normalizeNumber((x as any).quantityValue, 1);
        const qu = String((x as any).quantityUnit || "pcs");
        const unitCost = normalizeNumber((x as any).unitCost, 0);
        const totalPrice =
          normalizeNumber((x as any).totalPrice ?? (x as any).total_price, 0) || unitCost * qv;

        return {
          ...x,
          name: String(x.name).trim(),
          quantityValue: qv,
          quantityUnit: qu,
          quantity: `${qv} ${qu}`,
          unitCost,
          totalPrice,
          expiryDate: normalizeDDMMYYYY((x as any).expiryDate),
          category: String((x as any).category || 'Other'), // 🆕 Explicitly include category
        } as InventoryItem;
      });

    // 🆕 Receipt scan = Cumulative (Add quantity)
    onItemsFound(cleaned, 'cumulative');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-2 md:p-4">
      <div className="w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] bg-white rounded-xl md:rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 md:p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-primary">
              {mode === "receipt" ? "Scan Receipt" : mode === "fridge" ? "Scan Fridge" : "Scan Sales"}
            </h2>
            <p className="text-xs md:text-sm text-secondary mt-1 hidden sm:block">Upload a photo, run AI, then confirm the results.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background text-secondary" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-6 pt-3 md:pt-4 shrink-0 overflow-x-auto">
          <div className="inline-flex rounded-xl border border-border bg-white overflow-hidden">
            {(["receipt", "fridge"] as ScanMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setReviewItems([]);
                  setStep("upload");
                }}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-bold whitespace-nowrap ${mode === m ? "bg-primary text-white" : "text-primary hover:bg-background"
                  }`}
              >
                {m === "receipt" ? "Receipt" : "Fridge"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-auto flex-1">
          {/* Error Display */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
              <div className="font-bold mb-1">Error</div>
              <div>{error}</div>
              {rawOutput && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-red-500">Show raw API output</summary>
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                    {rawOutput.slice(0, 1000)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {step === "upload" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Left: Upload */}
              <div className="space-y-4">
                {/* Fridge mode: Multi-photo upload */}
                {mode === "fridge" ? (
                  <>
                    <div className="flex items-center justify-between gap-4 bg-background rounded-xl border border-border p-4">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg cursor-pointer hover:bg-background">
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-bold">Add Photo ({fridgePhotos.length}/5)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) addFridgePhoto(f);
                          }}
                        />
                      </label>

                      <button
                        onClick={runAI}
                        disabled={analyzing || fridgePhotos.length === 0}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white font-bold hover:bg-black disabled:opacity-50"
                      >
                        {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        Analyze {fridgePhotos.length} Photo{fridgePhotos.length !== 1 ? 's' : ''}
                      </button>
                    </div>

                    {/* Multi-photo thumbnails */}
                    {fridgePhotos.length > 0 ? (
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="grid grid-cols-5 gap-2 mb-2">
                          {fridgePhotos.map((photo, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-white">
                              <img src={photo.preview} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeFridgePhoto(idx)}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ✕
                              </button>
                              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{idx + 1}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-secondary">Take multiple angles for better accuracy. AI will merge results.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border bg-background p-10 text-center text-secondary text-sm">
                        <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <div>Add photos from different angles</div>
                        <div className="text-xs mt-1">Up to 5 photos for best accuracy</div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Receipt/Sales mode: Single photo */
                  <>
                    <div className="flex items-center justify-between gap-4 bg-background rounded-xl border border-border p-4">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg cursor-pointer hover:bg-background">
                        <UploadCloud className="w-4 h-4" />
                        <span className="text-sm font-bold">Choose Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleChoose(f);
                          }}
                        />
                      </label>

                      <button
                        onClick={runAI}
                        disabled={analyzing || !file}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white font-bold hover:bg-black disabled:opacity-50"
                      >
                        {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        Analyze
                      </button>
                    </div>

                    {previewUrl ? (
                      <div className="rounded-xl border border-border bg-background p-4">
                        <img src={previewUrl} alt="preview" className="max-h-[360px] w-full object-contain rounded-lg bg-white" />
                        <p className="text-xs text-secondary mt-2">Supported: jpg/png/webp. Better light = better accuracy.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border bg-background p-10 text-center text-secondary text-sm">
                        Choose an image to start.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right: Instructions */}
              <div className="space-y-4">
                <div className="font-bold text-primary text-sm md:text-base">Instructions</div>
                <ol className="list-decimal list-inside text-xs md:text-sm text-secondary space-y-1 md:space-y-2">
                  {mode === "fridge" ? (
                    <>
                      <li>Add 1-5 photos from different angles.</li>
                      <li>Click Analyze (AI will merge all photos).</li>
                      <li>Check low-confidence rows (red highlight).</li>
                      <li>Fix names and quantities as needed.</li>
                      <li>Confirm to add items to inventory.</li>
                    </>
                  ) : (
                    <>
                      <li>Upload a clear photo (no glare, text not cut off).</li>
                      <li>Click Analyze.</li>
                      <li>Check low-confidence rows (red highlight).</li>
                      <li>Fix names using the dropdown suggestions.</li>
                      <li>Confirm to add items to inventory.</li>
                    </>
                  )}
                </ol>

                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                    RAG (Inventory Dictionary)
                  </div>
                  <div className="text-sm text-primary">
                    Current dictionary size: {dictionary.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "review" && (
            <>
              {isReceiptLike && (
                <>
                  <div className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">
                    Review Items ({reviewItems.length})
                  </div>
                  {reviewItems.length === 0 ? (
                    <div className="text-center text-secondary py-10">No items found.</div>
                  ) : (
                    <div className="space-y-4">
                      {reviewItems.map((it) => {
                        const conf = normalizeNumber(it.confidence, 0.6);
                        const low = conf < 0.8;
                        const sug = suggestionsFor(it.name, it.candidates);

                        return (
                          <div
                            key={it.id}
                            className={`rounded-xl border p-4 bg-white ${low ? "border-red-200" : "border-border"
                              }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <div className="font-bold text-primary truncate">{it.name || "(empty)"}</div>
                                  <div
                                    className={`text-xs font-mono px-2 py-1 rounded-md ${low ? "bg-red-50 text-red-700" : "bg-background text-secondary"
                                      }`}
                                  >
                                    conf {(conf * 100).toFixed(0)}%
                                  </div>
                                  {(it.flags || []).length > 0 && (
                                    <div className="text-xs px-2 py-1 rounded-md bg-yellow-50 text-yellow-800">
                                      {(it.flags || []).join(", ")}
                                    </div>
                                  )}
                                </div>

                                <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-3">
                                  {/* Name */}
                                  <div className="md:col-span-2">
                                    <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                                      Name
                                    </div>
                                    <input
                                      value={it.name || ""}
                                      onChange={(e) => updateItem(it.id, { name: e.target.value } as any)}
                                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                                      placeholder="e.g. carrot"
                                    />
                                    {sug.length > 0 && (
                                      <select
                                        className="mt-2 w-full px-3 py-2 rounded-lg border border-border text-sm bg-white"
                                        value=""
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          if (v) updateItem(it.id, { name: v, is_new_item: false } as any);
                                        }}
                                      >
                                        <option value="">Choose suggestion…</option>
                                        {sug.map((s) => (
                                          <option key={s} value={s}>
                                            {s}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </div>

                                  {/* Qty */}
                                  <div>
                                    <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                                      Qty
                                    </div>
                                    <input
                                      type="number"
                                      value={String((it as any).quantityValue ?? 1)}
                                      onChange={(e) =>
                                        updateItem(it.id, { quantityValue: normalizeNumber(e.target.value, 1) } as any)
                                      }
                                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                                      min={0}
                                      step={0.1}
                                    />
                                  </div>

                                  {/* Unit */}
                                  <div>
                                    <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                                      Unit
                                    </div>
                                    <input
                                      value={String((it as any).quantityUnit ?? "pcs")}
                                      onChange={(e) => updateItem(it.id, { quantityUnit: e.target.value } as any)}
                                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                                    />
                                  </div>

                                  {/* Category */}
                                  <div>
                                    <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                                      Category
                                    </div>
                                    <select
                                      value={String((it as any).category || "Other")}
                                      onChange={(e) => updateItem(it.id, { category: e.target.value } as any)}
                                      className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-white"
                                    >
                                      {ALLOWED_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Cost */}
                                  <div className={mode === "fridge" ? "hidden" : ""}>
                                    <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                                      Unit £
                                    </div>
                                    <input
                                      type="number"
                                      value={String((it as any).unitCost ?? 0)}
                                      onChange={(e) =>
                                        updateItem(it.id, { unitCost: normalizeNumber(e.target.value, 0) } as any)
                                      }
                                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                                      min={0}
                                      step={0.01}
                                    />
                                  </div>

                                  {/* Expiry */}
                                  <div className="md:col-span-1">
                                    <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                                      Expiry
                                    </div>
                                    <input
                                      value={String((it as any).expiryDate ?? "")}
                                      onChange={(e) => updateItem(it.id, { expiryDate: e.target.value } as any)}
                                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                                      placeholder="dd/mm/yyyy"
                                    />
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => removeItem(it.id)}
                                className="p-2 rounded-lg border border-border hover:bg-background text-secondary"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 🆕 Not Found Items (Fridge Audit) */}
                  {mode === "fridge" && auditResult && auditResult.notFound.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-bold text-yellow-800">
                          Not Found ({auditResult.notFound.length})
                        </h4>
                      </div>
                      <p className="text-xs text-yellow-700 mb-3">
                        These items exist in your inventory but were not detected in this scan. Choose how to handle them:
                      </p>
                      {auditResult.notFound.map((name, idx) => {
                        const dictItem = dictionaryItems.find(d => d.name === name);
                        return (
                          <div
                            key={idx}
                            className="flex justify-between items-center py-2 border-b border-yellow-200 last:border-0"
                          >
                            <div>
                              <span className="font-medium">{name}</span>
                              <span className="text-xs text-yellow-600 ml-2">
                                Current: {dictItem?.currentQty || 0} {dictItem?.unit}
                              </span>
                            </div>
                            <select
                              value={notSeenAction[name] || 'keep'}
                              onChange={(e) => setNotSeenAction({
                                ...notSeenAction,
                                [name]: e.target.value as 'keep' | 'zero'
                              })}
                              className="text-sm border border-yellow-300 rounded px-2 py-1 bg-white"
                            >
                              <option value="keep">Keep Unchanged</option>
                              <option value="zero">Set to Zero (Used Up)</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Missing Item Button/Form */}
                  <div className="mt-4">
                    {!showAddForm ? (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Missing Item
                      </button>
                    ) : (
                      <AddItemQuickForm
                        onAdd={addMissingItem}
                        onCancel={() => setShowAddForm(false)}
                        suggestions={dictionary}
                      />
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-border">
                <button
                  onClick={() => {
                    setStep("upload");
                    setError("");
                    setRawOutput("");
                  }}
                  className="px-4 py-2 rounded-lg border border-border bg-white text-primary font-bold text-sm hover:bg-background"
                >
                  Back
                </button>

                <button
                  onClick={confirm}
                  className="px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-sm"
                >
                  {mode === "receipt"
                    ? "Confirm & Add to Inventory"
                    : mode === "fridge"
                      ? "Confirm & Add to Inventory"
                      : "Confirm & Save Sales"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;
