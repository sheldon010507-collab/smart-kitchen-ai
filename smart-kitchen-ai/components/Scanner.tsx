import React, { useEffect, useMemo, useState } from "react";
import { X, UploadCloud, Loader2, Wand2, Trash2 } from "lucide-react";
import type { InventoryItem, SalesReceipt } from "../types";

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

function getEnvApiKey() {
  const env = (import.meta as any).env ?? {};
  return (
    env.VITE_GEMINI_API_KEY ||
    env.VITE_GOOGLE_API_KEY ||
    env.VITE_API_KEY ||
    env.GEMINI_API_KEY ||
    ""
  );
}

function getEnvModel() {
  const env = (import.meta as any).env ?? {};
  return (env.VITE_GEMINI_MODEL || env.VITE_GOOGLE_MODEL || env.GEMINI_MODEL || "").trim();
}

function cleanModelName(model: string) {
  const m = (model || "").trim();
  if (!m) return "";
  return m.startsWith("models/") ? m.slice("models/".length) : m;
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
function extractJsonFromText(text: string): string {
  if (!text) return "";

  let t = text.trim();

  // 1. 移除 markdown code fence
  // 处理 ```json ... ``` 或 ``` ... ```
  const codeBlockMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    t = codeBlockMatch[1].trim();
  }

  // 2. 如果还有残留的 ``` 标记，移除它们
  t = t.replace(/^```(?:json)?/gi, "").replace(/```$/gi, "").trim();

  // 3. 找到 JSON 的开始位置 { 或 [
  const objIdx = t.indexOf("{");
  const arrIdx = t.indexOf("[");

  let start = -1;
  if (objIdx >= 0 && arrIdx >= 0) {
    start = Math.min(objIdx, arrIdx);
  } else if (objIdx >= 0) {
    start = objIdx;
  } else if (arrIdx >= 0) {
    start = arrIdx;
  }

  if (start < 0) return "";

  t = t.slice(start);

  // 4. 找到匹配的结束位置
  // 使用括号匹配来找到正确的结束位置
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endPos = -1;

  for (let i = 0; i < t.length; i++) {
    const char = t[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{" || char === "[") {
      depth++;
    } else if (char === "}" || char === "]") {
      depth--;
      if (depth === 0) {
        endPos = i;
        break;
      }
    }
  }

  if (endPos >= 0) {
    t = t.slice(0, endPos + 1);
  }

  return t.trim();
}

// ✅ 清理 JSON 字符串
function sanitizeJson(maybeJson: string): string {
  let s = (maybeJson || "").trim();

  // 移除 BOM 和零宽字符
  s = s.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\u2060]/g, "");

  // 移除尾随逗号
  s = s.replace(/,\s*([}\]])/g, "$1");

  // 移除控制字符（除了换行和制表符）
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  return s;
}

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

function buildPrompt(mode: ScanMode, dictionary: string[]) {
  const dict = dictionary.length ? dictionary.slice(0, 300).join("、") : "";

  // ✅ 更强调纯 JSON 输出，禁止 markdown
  const jsonWarning = `
【重要】你必须：
1. 只输出纯 JSON，不要任何其他文字
2. 不要使用 markdown 代码块（不要 \`\`\`json 或 \`\`\`）
3. 直接以 { 或 [ 开头
4. 如果图片模糊或无法识别，返回 {"items": []}
`;

  if (mode === "sales") {
    return `你是餐厅POS小票识别助手。请从图片中提取"销售小票"的结构化信息。
${jsonWarning}
返回格式：
{
  "date": "dd/mm/yyyy",
  "time": "HH:MM",
  "items": [
    { "name": "string", "quantity": 1, "price": 0, "confidence": 0.8 }
  ],
  "total_amount": 0
}
规则：
- quantity 默认为 1
- price 为单价
- confidence 0~1
- 如果看不清，返回 {"items": [], "total_amount": 0}`;
  }

  const rag = dict
    ? `上下文约束：以下是已有的食材字典（优先匹配这些名字）：
[${dict}]
如果识别出的名字接近字典中的某个词，请优先输出字典里的标准名，并在 candidates 里给出备选。`
    : `上下文约束：如果无法确定标准名，请在 candidates 里给出备选。`;

  const schema = `返回格式：
{
  "items": [
    {
      "name": "食材名",
      "quantity_value": 1,
      "quantity_unit": "pcs",
      "unit_cost": 0,
      "total_price": 0,
      "expiry_date": "",
      "category": "",
      "location": "",
      "confidence": 0.8,
      "is_new_item": false,
      "candidates": []
    }
  ]
}`;

  if (mode === "receipt") {
    return `你是采购发票识别助手。从图片中提取采购食材列表。
${rag}
${jsonWarning}
${schema}
规则：
- quantity_value 默认 1；quantity_unit 默认 "pcs"
- unit_cost 是单价；total_price 是总价
- expiry_date 格式 dd/mm/yyyy，没有就空字符串
- confidence 0~1
- 如果看不清，返回 {"items": []}`;
  }

  // fridge
  return `你是冰箱盘点助手。识别冰箱图片中可见的食材列表。
${rag}
${jsonWarning}
${schema}
规则：
- quantity_value 默认 1；quantity_unit 默认 "pcs"
- unit_cost/total_price 看不到填 0
- confidence 0~1
- 如果看不清，返回 {"items": []}`;
}

async function listModels(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  return models
    .filter((m: any) => (m?.supportedGenerationMethods || []).includes("generateContent"))
    .map((m: any) => String(m?.name || ""))
    .filter(Boolean);
}

function pickPreferredModel(availableModelNames: string[]) {
  const clean = availableModelNames.map(cleanModelName);
  // ✅ 优先使用稳定的模型，避免 preview 版本
  const prefer = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-pro-vision",
    "gemini-1.0-pro-vision",
  ];
  for (const p of prefer) {
    const hit = clean.find((n) => n.includes(p));
    if (hit) return hit;
  }
  return clean[0] || "";
}

async function generateContentVision(args: {
  apiKey: string;
  model: string;
  prompt: string;
  mime: string;
  base64: string;
}): Promise<string> {
  const cleanModel = cleanModelName(args.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    cleanModel
  )}:generateContent?key=${encodeURIComponent(args.apiKey)}`;

  // ✅ 根据模型决定是否使用 responseMimeType
  // gemini-1.5 系列支持 responseMimeType，其他可能不支持
  const supportsJsonMode = cleanModel.includes("1.5") || cleanModel.includes("2.0");

  const body: any = {
    contents: [
      {
        role: "user",
        parts: [
          { text: args.prompt },
          { inlineData: { mimeType: args.mime, data: args.base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
    },
  };

  // 只有支持的模型才添加 responseMimeType
  if (supportsJsonMode) {
    body.generationConfig.responseMimeType = "application/json";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini API error (${res.status}): ${text}`);
  }

  const json = JSON.parse(text);

  // ✅ 更健壮的响应提取
  const candidates = json?.candidates || [];
  if (candidates.length === 0) {
    throw new Error("Gemini returned no candidates");
  }

  const parts = candidates[0]?.content?.parts || [];
  const out = parts.map((p: any) => p?.text || "").filter(Boolean).join("\n");

  // ✅ 添加调试日志
  console.log("[Gemini raw output]:", out.slice(0, 500));

  return out;
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

    const apiKey = getEnvApiKey();
    if (!apiKey) {
      setError("Missing API key. Put VITE_GEMINI_API_KEY in your .env and restart dev server.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setRawOutput("");

    try {
      const { base64, mime } = await fileToBase64(file);

      // ✅ 选择模型
      let model = getEnvModel();
      if (!model) {
        try {
          const available = await listModels(apiKey);
          console.log("[Available models]:", available);
          model = pickPreferredModel(available);
        } catch (e) {
          console.warn("[listModels failed]:", e);
        }
      }

      // ✅ 使用更稳定的模型列表
      const modelsToTry = uniq([
        model,
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash-exp",
        "gemini-pro-vision",
      ]).filter(Boolean);

      console.log("[Models to try]:", modelsToTry);

      const prompt = buildPrompt(mode, dictionary);

      let outText = "";
      let lastErr: any = null;
      let usedModel = "";

      for (const m of modelsToTry) {
        try {
          console.log(`[Trying model]: ${m}`);
          outText = await generateContentVision({ apiKey, model: m, prompt, mime, base64 });
          if (outText) {
            usedModel = m;
            break;
          }
        } catch (e: any) {
          lastErr = e;
          console.warn(`[Model ${m} failed]:`, e?.message);
          const msg = String(e?.message || "");
          if (msg.includes("(404)") || msg.includes("NOT_FOUND") || msg.includes("not found")) {
            continue;
          }
          // 其他错误也继续尝试下一个模型
          continue;
        }
      }

      if (!outText) {
        throw lastErr || new Error("No output from Gemini. All models failed.");
      }

      console.log(`[Success with model]: ${usedModel}`);
      setRawOutput(outText); // 保存原始输出

      // ✅ 使用更健壮的 JSON 提取
      const jsonText = sanitizeJson(extractJsonFromText(outText));
      console.log("[Extracted JSON]:", jsonText.slice(0, 500));

      if (!jsonText) {
        throw new Error(`Gemini returned non-JSON output. Raw: ${outText.slice(0, 200)}...`);
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseErr) {
        console.error("[JSON parse error]:", parseErr);
        console.error("[Raw text]:", outText);
        console.error("[Extracted text]:", jsonText);
        throw new Error(`JSON parse failed. Check console for details. Raw output: ${outText.slice(0, 100)}...`);
      }

      if (mode === "sales") {
        const items = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
        const receipt: SalesReceipt = {
          id: (crypto as any)?.randomUUID?.() ?? String(Date.now()),
          date: parsed?.date || "",
          time: parsed?.time || "",
          items: items.map((x: any) => ({
            name: String(x?.name || ""),
            quantity: normalizeNumber(x?.quantity, 1),
            price: normalizeNumber(x?.price, 0),
          })),
          totalAmount: normalizeNumber(parsed?.total_amount, 0),
        } as any;

        setSalesDraft(receipt);
        setStep("review");
        return;
      }

      // ✅ 处理可能的不同响应格式
      let rawItems: any[] = [];
      if (Array.isArray(parsed?.items)) {
        rawItems = parsed.items;
      } else if (Array.isArray(parsed?.found_items)) {
        rawItems = parsed.found_items;
      } else if (Array.isArray(parsed)) {
        rawItems = parsed;
      }

      if (rawItems.length === 0) {
        setError("No items found in the image. Please try with a clearer photo.");
        return;
      }

      const mapped: ReviewItem[] = rawItems.map((x: any, idx: number) => {
        const qv = normalizeNumber(x?.quantity_value ?? x?.quantity ?? 1, 1);
        const qu = String(x?.quantity_unit ?? x?.unit ?? "pcs");
        const unitCost = normalizeNumber(x?.unit_cost ?? x?.unitPrice ?? 0, 0);

        const totalPrice =
          normalizeNumber(x?.total_price ?? x?.total ?? 0, 0) || unitCost * qv;

        const name = String(x?.name || "").trim();
        const sug = suggestionsFor(name, Array.isArray(x?.candidates) ? x.candidates : []);

        const inDict =
          dictionary.length > 0 &&
          topMatches(name, dictionary, 1).length > 0 &&
          simpleScore(name, topMatches(name, dictionary, 1)[0]) >= 300;

        const confidence = normalizeNumber(x?.confidence, 0.6);
        const isNew = typeof x?.is_new_item === "boolean" ? x.is_new_item : !inDict;

        const item: ReviewItem = {
          id: `${Date.now()}_${idx}`,
          name,
          quantityValue: qv,
          quantityUnit: qu,
          quantity: `${qv} ${qu}`,
          unitCost,
          totalPrice,
          expiryDate: normalizeDDMMYYYY(x?.expiry_date),
          category: String(x?.category || ""),
          location: String(x?.location || ""),
          confidence: Math.max(0, Math.min(1, confidence)),
          candidates: sug,
          is_new_item: isNew,
          raw_name: String(x?.raw_name || ""),
        } as any;

        return item;
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
      try {
        const payload = {
          at: new Date().toISOString(),
          items: reviewItems.map((x) => ({ name: x.name, confidence: x.confidence })),
        };
        localStorage.setItem("lastFridgeScan", JSON.stringify(payload));
      } catch {
        // ignore
      }

      // Convert review items to InventoryItem format and call onItemsFound
      const cleaned = reviewItems
        .filter((x) => String(x.name || "").trim())
        .map((x) => {
          const qv = normalizeNumber((x as any).quantityValue ?? (x as any).quantity_value ?? 1, 1);
          const qu = String((x as any).quantityUnit || "pcs");
          const unitCost = normalizeNumber((x as any).unitCost, 0);

          return {
            ...x,
            name: String(x.name).trim(),
            quantityValue: qv,
            quantityUnit: qu,
            quantity: `${qv} ${qu}`,
            unitCost,
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
                      ? "Confirm (No Inventory Update)"
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
