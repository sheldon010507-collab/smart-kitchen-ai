# 發票掃描 JSON 解析失敗 - 根因分析

**日期**: 2026-01-26  
**方法**: 第一性原理 + 完整數據流追溯

---

## 一、症狀回顧

| 錯誤類型 | 錯誤信息 | 觀察到的 ctxSnippet |
|----------|----------|---------------------|
| 截斷 | `Expected ',' or ']' after array element at position 2649` | 以 `"notes\": \"...\"\n    }` 結尾 |
| 超長小數 | `Expected ',' or '}' after property value at position 3831/912` | `0000000000000000000000...` (數百個 0) |

---

## 二、數據流完整追溯

```
用戶上傳照片
    ↓
PhotoScanSection.handleAnalyze()
    ↓
analyzeMultipleInvoices() / analyzeInvoice()
    ↓
callGeminiApi() / callGeminiMultiImageApi()
    ↓
POST /api/gemini { prompt, images, config: { responseSchema, ... } }
    ↓
api/gemini.ts handler
    ↓
fetch(Google Generative AI REST API)
    body: { contents, generationConfig: { ...defaultConfig, ...config } }
    ↓
Google 返回 data.candidates[0].content.parts[0].text
    ↓
validateInvoiceScanResult(text)
    ↓
JSON.parse(cleaned)  ← 失敗點
```

---

## 三、根因分析（第一性原理）

### 3.1 為何 Gemini 返回超長小數？

**現象**: `"tax":0.0000000000000000000000000000000000000000000000000000000000000000000000...`

**根因假設 A**: Gemini 的 `responseSchema` 未被正確傳遞給 Google API，導致模型以自由文本模式輸出，不受 schema 約束。

**驗證**: 查閱 [Google Gemini API 文檔](https://ai.google.dev/gemini-api/docs/structured-output)：

- REST API 要求的參數為 **`responseJsonSchema`**（或 `response_schema`）
- 我們的代碼傳遞的是 **`responseSchema`**
- **結論**: 屬性名錯誤 → schema 被忽略 → Gemini 自由輸出 → 可能產生超長小數、截斷、格式不一致

### 3.2 為何出現截斷？

**現象**: 字符串在 `items` 數組最後一個元素後結束，缺少 `]` 和 `}`

**根因**:
1. `maxOutputTokens: 8192` 可能仍不足（長發票 + 多圖）
2. 沒有 schema 約束時，模型可能生成冗長或格式不穩定的輸出，更容易觸發 token 限制

### 3.3 API 配置比對

| 我們的傳遞 | Google API 期望 | 結果 |
|------------|-----------------|------|
| `responseSchema` | `responseJsonSchema` | ❌ 被忽略 |
| `responseMimeType` | `responseMimeType` | ✅ 正確 |

---

## 四、修復方案

### 4.1 根本修復（必須）

在 `api/gemini.ts` 中，將 `responseSchema` 映射為 `responseJsonSchema`，確保 Google API 正確接收 schema：

```typescript
// 確保 Google API 接收正確的 schema 屬性名
const generationConfig = { ...defaultConfig, ...config };
if (generationConfig.responseSchema && !generationConfig.responseJsonSchema) {
  generationConfig.responseJsonSchema = generationConfig.responseSchema;
  delete generationConfig.responseSchema;
}
```

### 4.2 防禦性修復（保留）

- 數字 sanitization：將超過 5 位小數的數值截斷為 4 位
- 截斷修復：當 JSON 在末尾被截斷時嘗試修補 `]` 和 `}`

### 4.3 可選優化

- 在 prompt 中明確要求：`"tax": 0` 而非 `"tax": 0.0000000...`
- 為 `tax`、`subtotal`、`grandTotal` 等數字欄位在 schema 中添加 `minimum`/`maximum` 約束

---

## 五、驗證清單

修復後應驗證：

1. [ ] Vercel 部署的 API 收到 `responseJsonSchema`（可通過 Vercel 日誌或臨時 console.log 確認）
2. [ ] 發票掃描成功返回項目列表
3. [ ] 控制台無 "Failed to parse invoice scan result" 錯誤
4. [ ] 長發票（多項目）仍能正常解析
