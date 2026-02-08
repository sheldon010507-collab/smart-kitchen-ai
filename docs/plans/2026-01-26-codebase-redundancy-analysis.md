# 代碼冗餘與問題分析

**日期**: 2026-01-26  
**方法**: 第一性原理 + 全代碼掃描

---

## 一、必須清理（生產代碼中的調試殘留）

### 1.1 Debug Instrumentation 未移除

| 位置 | 問題 | 影響 |
|------|------|------|
| `promptTemplates.ts` | `#region agent log`、fetch(127.0.0.1)、`__DEBUG_INVOICE_PARSE`、console.error | 生產環境 CORS 錯誤、洩露調試信息 |
| `geminiService.ts` | 兩處 agent log fetch | 同上 |
| `PhotoScanSection.tsx` | agent log fetch | 同上 |

**原則**: 根因已修復，調試代碼應移除。`verification-before-completion` 要求驗證後清理。

---

## 二、重複定義（DRY 違反）

### 2.1 invoiceItemSchema 重複

```
geminiService.ts:
  - analyzeInvoice() 內定義 invoiceItemSchema（L394）
  - analyzeMultipleInvoices() 內定義 invoiceItemSchema（L512）
  → 兩處結構完全相同
```

**修復**: 提取為模組級常數 `INVOICE_ITEM_SCHEMA`。

### 2.2 JSON 清理邏輯重複

三個 validate 函數有相同的前置步驟：

```
validateAndParseScanResult     → replace ```, extract {..}, parse
validateFridgeAuditResult      → replace ```, extract {..}, parse  
validateInvoiceScanResult      → replace ```, sanitize decimals, extract, parse
```

**差異**: 僅 `validateInvoiceScanResult` 有 decimal sanitization 和 truncation repair。

**建議**: 提取 `cleanAndExtractJson(raw: string, options?: { sanitizeDecimals?: boolean })` 為共享工具。可選優化，非緊急。

---

## 三、潛在風險（未修復但不阻塞）

### 3.1 validateFridgeAuditResult / validateAndParseScanResult

若 Gemini 在 Fridge Audit 或庫存掃描中也返回超長小數，會遇到相同解析失敗。目前僅發票掃描報告此問題，可觀察後再決定是否對其他 validate 函數加入 sanitization。

### 3.2 冗餘的 repair 日誌

`validateInvoiceScanResult` 中的 `console.warn('[Invoice] Attempting...')`、`'Repair failed'`、`'Truncation repair skipped'` 在修復成功後可降級為 `if (import.meta.env.DEV)` 或移除。

---

## 四、清理優先級

| 優先級 | 項目 | 理由 |
|--------|------|------|
| P0 | 移除 debug instrumentation | 生產代碼不應含調試、避免 CORS 錯誤 |
| P1 | 提取 invoiceItemSchema | 減少重複、易維護 |
| P2 | 簡化 repair 日誌 | 減少噪音，可選 |
| P3 | 提取 JSON 清理工具 | 大重構，可納入 Phase 4 |
