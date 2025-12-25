import React, { useEffect, useMemo, useState } from "react";
import { X, UploadCloud, Loader2, Wand2, Trash2 } from "lucide-react";
import type { InventoryItem, SalesReceipt } from "../types";
import { analyzeInventoryImage, analyzePOSReceipt } from "../services/geminiService";

type ScanMode = "receipt" | "fridge" | "sales";

type ReviewItem = InventoryItem & {
  confidence?: number; // 0~1
  candidates?: string[];
  is_new_item?: boolean;
  raw_name?: string;
  flags?: string[];
};

interface Props {
  initialMode: ScanMode;
  onClose: () => void;
  onItemsFound: (items: InventoryItem[]) => void;
  onSalesProcessed: (receipt: SalesReceipt) => void;
  inventoryNameOptions?: string[]; // RAG: existing ingredient dictionary
}



async function fileToBase64(file: File): Promise<{ base64: string; mime: string; dataUrl: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mimeMatch = dataUrl.match(/^data:(.*?);base64,/);
  const mime = mimeMatch?.[1] || file.type || "image/jpeg";
  return { base64, mime, dataUrl };
}

// ✅ 更健壮的 JSON 提取函数


function normalizeDDMMYYYY(input: string | undefined | null): string {
  const v = (input || "").trim();
  if (!v) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const iso2 = v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (iso2) return `${iso2[3]}/${iso2[2]}/${iso2[1]}`;
  return v;
}

function normalizeNumber(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
}

function simpleScore(a: string, b: string) {
  const A = a.toLowerCase().trim();
  const B = b.toLowerCase().trim();
  if (!A || !B) return 0;
  if (A === B) return 1000;
  if (A.includes(B) || B.includes(A)) return 300;
  let score = 0;
  for (const ch of new Set(A.split(""))) {
    if (B.includes(ch)) score += 2;
  }
  return score;
}

function topMatches(query: string, options: string[], limit = 6) {
  const scored = options
    .map((o) => ({ o, s: simpleScore(query, o) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.o);
  return uniq(scored);
}



function validateAndFlagItems(items: ReviewItem[]) {
  return items.map((it) => {
    const flags: string[] = [];
    const qty = normalizeNumber((it as any).quantityValue, 1);
    const unitCost = normalizeNumber((it as any).unitCost, 0);
    const total = normalizeNumber((it as any).totalPrice ?? (it as any).total_price, 0);

    if (qty > 200) flags.push("Quantity too large");
    if (unitCost > 1000) flags.push("Unit cost too high");
    if (total > 5000) flags.push("Total price too high");

    return { ...it, flags };
  });
}

const Scanner: React.FC<Props> = ({
  initialMode,
  onClose,
  onItemsFound,
  onSalesProcessed,
  inventoryNameOptions = [],
}) => {
  const [mode, setMode] = useState<ScanMode>(initialMode);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [error, setError] = useState<string>("");
  const [rawOutput, setRawOutput] = useState<string>(""); // ✅ 保存原始输出用于调试
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [salesDraft, setSalesDraft] = useState<SalesReceipt | null>(null);

  const dictionary = useMemo(() => uniq(inventoryNameOptions), [inventoryNameOptions]);

  useEffect(() => {
    setMode(initialMode);
    setFile(null);
    setPreviewUrl("");
    setError("");
    setRawOutput("");
    setStep("upload");
    setReviewItems([]);
    setSalesDraft(null);
  }, [initialMode]);

  const isReceiptLike = mode === "receipt" || mode === "fridge";

  const suggestionsFor = (name: string, candidates?: string[]) => {
    const a = candidates ?? [];
    const b = topMatches(name, dictionary, 8);
    return uniq([...a, ...b]).slice(0, 10);
  };

  const handleChoose = async (f: File) => {
    setError("");
    setRawOutput("");
    setFile(f);
    try {
      const { dataUrl } = await fileToBase64(f);
      setPreviewUrl(dataUrl);
    } catch (e: any) {
      setError(e?.message || "Failed to load image.");
    }
  };

  const runAI = async () => {
    if (!file) {
      setError("Please choose an image first.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setRawOutput("");

    try {
      const { base64, mime } = await fileToBase64(file);

      // Mode: Sales
      if (mode === "sales") {
        const receipt = await analyzePOSReceipt(base64, mime);
        if (!receipt || !receipt.items || receipt.items.length === 0) {
          // Fallback or error
          if (!receipt) throw new Error("No sales data found.");
        }

        const draft: SalesReceipt = {
          id: (crypto as any)?.randomUUID?.() ?? String(Date.now()),
          date: receipt.date || "",
          time: receipt.time || "",
          items: (receipt.items || []).map((x: any) => ({
            name: String(x.name),
            quantity: normalizeNumber(x.quantity, 1),
            price: normalizeNumber(x.price, 0),
          })),
          totalAmount: normalizeNumber(receipt.totalAmount, 0),
        } as any;

        setSalesDraft(draft);
        setStep("review");
        return;
      }

      // Mode: Receipt or Fridge
      const rawItems = await analyzeInventoryImage(
        base64,
        mime,
        mode as 'receipt' | 'fridge',
        dictionary // Pass dictionary for RAG
      );

      if (!rawItems || rawItems.length === 0) {
        throw new Error("No items found. Please try a clearer photo.");
      }

      const mapped: ReviewItem[] = rawItems.map((x: any, idx: number) => {
        const qv = normalizeNumber(x.quantityValue ?? x.quantity_value, 1);
        const qu = String(x.quantityUnit ?? x.quantity_unit ?? "pcs");
        const unitCost = normalizeNumber(x.unitCost ?? x.unit_cost, 0);
        const total = normalizeNumber(x.totalPrice ?? x.total_price, 0);

        const name = String(x.name || "").trim();
        const category = String(x.category || "");
        const location = String(x.location || "");
        const expiry = normalizeDDMMYYYY(x.expiryDate ?? x.expiry_date);

        // Use confidence from AI if available
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
          flags: [], // Populated by validateAndFlagItems
          raw_name: name
        } as unknown as ReviewItem;
      });

      setReviewItems(validateAndFlagItems(mapped));
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

  const confirm = () => {
    setError("");

    if (mode === "sales") {
      if (!salesDraft) {
        setError("No sales data to confirm.");
        return;
      }
      onSalesProcessed(salesDraft);
      onClose();
      return;
    }

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
          } as InventoryItem;
        });

      onItemsFound(cleaned);
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
        } as InventoryItem;
      });

    onItemsFound(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-xl font-bold text-primary">
              {mode === "receipt" ? "Scan Receipt" : mode === "fridge" ? "Scan Fridge" : "Scan Sales"}
            </h2>
            <p className="text-sm text-secondary mt-1">Upload a photo, run AI, then confirm the results.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background text-secondary" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 shrink-0">
          <div className="inline-flex rounded-xl border border-border bg-white overflow-hidden">
            {(["receipt", "fridge", "sales"] as ScanMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                  setRawOutput("");
                  setReviewItems([]);
                  setSalesDraft(null);
                  setStep("upload");
                }}
                className={`px-4 py-2 text-sm font-bold ${mode === m ? "bg-primary text-white" : "text-primary hover:bg-background"
                  }`}
              >
                {m === "receipt" ? "Receipt" : m === "fridge" ? "Fridge" : "Sales"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto flex-1">
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
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Upload */}
              <div className="space-y-4">
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
              </div>

              {/* Right: Instructions */}
              <div className="space-y-4">
                <div className="font-bold text-primary">What you will do</div>
                <ol className="list-decimal list-inside text-sm text-secondary space-y-2">
                  <li>Upload a clear photo (no glare, text not cut off).</li>
                  <li>Click Analyze.</li>
                  <li>Check low-confidence rows (red highlight).</li>
                  <li>Fix names using the dropdown suggestions.</li>
                  <li>Confirm: {mode === "fridge" ? "will only save the list (no inventory update)" : "will add to inventory"}.</li>
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
              {mode === "sales" && salesDraft && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Date</div>
                      <input
                        value={salesDraft.date}
                        onChange={(e) => setSalesDraft({ ...salesDraft, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Time</div>
                      <input
                        value={salesDraft.time}
                        onChange={(e) => setSalesDraft({ ...salesDraft, time: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Total</div>
                      <input
                        type="number"
                        value={salesDraft.totalAmount}
                        onChange={(e) => setSalesDraft({ ...salesDraft, totalAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      />
                    </div>
                  </div>

                  <div className="text-sm font-bold text-secondary uppercase tracking-widest">
                    Items ({salesDraft.items.length})
                  </div>
                  <div className="space-y-2">
                    {salesDraft.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white">
                        <input
                          value={it.name}
                          onChange={(e) => {
                            const items = [...salesDraft.items];
                            items[idx] = { ...it, name: e.target.value };
                            setSalesDraft({ ...salesDraft, items });
                          }}
                          className="flex-1 px-3 py-2 rounded-lg border border-border text-sm"
                        />
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => {
                            const items = [...salesDraft.items];
                            items[idx] = { ...it, quantity: Number(e.target.value) };
                            setSalesDraft({ ...salesDraft, items });
                          }}
                          className="w-20 px-3 py-2 rounded-lg border border-border text-sm"
                        />
                        <input
                          type="number"
                          value={it.price}
                          onChange={(e) => {
                            const items = [...salesDraft.items];
                            items[idx] = { ...it, price: Number(e.target.value) };
                            setSalesDraft({ ...salesDraft, items });
                          }}
                          className="w-24 px-3 py-2 rounded-lg border border-border text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

                                <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
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
