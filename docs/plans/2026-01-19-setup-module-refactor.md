# Setup 模块重构 实施计划

**目标：** 修复 setup 模块的 7 个问题，提升用户体验和代码质量

**架构：** 复用现有 Gemini 多图 API，添加 xlsx 库支持，重构 wizard 步骤为连续流程，清理 deprecated 代码

**技术栈：** React 19, TypeScript, xlsx 库 (已安装), Gemini API

---

## 任务 1: Photo Scan 多图分析

**文件：**
- 修改：`components/setup/PhotoScanSection.tsx:72-124`
- 复用：`services/geminiService.ts` 中的 `callGeminiMultiImageApi`

### 步骤 1.1：创建新的多图分析函数

在 `geminiService.ts` 添加新函数 `analyzeMultipleInvoices`：

```typescript
/**
 * 🆕 多图发票/Receipt 分析 (Setup Wizard 用)
 * 处理多张照片，合并结果
 */
export const analyzeMultipleInvoices = async (
  images: Array<{ base64: string; mimeType: string }>,
  knownItems: string[] = []
): Promise<{
  supplier?: string;
  items: Array<{
    name: string;
    quantity?: number;
    unit: string;
    unitCost?: number;
    confidence: number;
  }>;
}> => {
  // 复用 callGeminiMultiImageApi，合并所有图片的结果
  // ...
}
```

### 步骤 1.2：修改 PhotoScanSection 使用多图分析

替换 `handleAnalyze` 函数：

```typescript
const handleAnalyze = useCallback(async () => {
  // 处理所有照片而不是只有第一张
  const allProcessed = await Promise.all(
    photos.map(p => preprocessImage(p.file, { targetSizeKB: 300, maxWidth: 1500, autoEnhance: true }))
  );
  
  const images = allProcessed.map(p => ({
    base64: p.base64,
    mimeType: 'image/jpeg'
  }));
  
  const result = await analyzeMultipleInvoices(images, existingNames);
  // ...
}, [photos, existingNames, onItemsFound]);
```

---

## 任务 2: Excel 真正支持 xlsx

**文件：**
- 修改：`components/setup/ExcelPreview.tsx:82-97`

### 步骤 2.1：导入 xlsx 库

```typescript
import * as XLSX from 'xlsx';
```

### 步骤 2.2：实现真正的 Excel 解析

```typescript
const parseFile = useCallback(async (file: File) => {
  setLoading(true);
  setError(null);
  
  try {
    let rows: string[][] = [];
    
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      const text = await file.text();
      rows = parseCSV(text);
    } else {
      // 🆕 真正的 Excel 解析
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    }
    // ...
  }
}, []);
```

---

## 任务 3: 步骤指示器重新设计

**文件：**
- 修改：`components/setup/types.ts:140`
- 修改：`components/setup/SetupStepIndicator.tsx:12-17`
- 修改：`components/setup/InventorySetupWizard.tsx`
- 修改：`components/setup/constants.ts:29-32`

### 步骤 3.1：重新定义 WizardStage 为连续步骤

```typescript
// types.ts - 改为
export type WizardStage = 1 | 2 | 3 | 4;
// 1: Import (原 Stage 1)
// 2: Clean (原 Stage 4)
// 3: Commit (原 Stage 5)
// 4: Success (原 Stage 6)
```

### 步骤 3.2：更新 SetupStepIndicator

```typescript
const STAGES: { stage: WizardStage; label: string }[] = [
    { stage: 1, label: 'Import' },
    { stage: 2, label: 'Clean' },
    { stage: 3, label: 'Confirm' },
];
```

### 步骤 3.3：更新 InventorySetupWizard 的阶段映射

删除 Stage 2/3 (Locations/Categories)，直接跳到 Cleanse。

---

## 任务 4: 移除 deprecated 字段

**文件：**
- 修改：`components/setup/types.ts:103-106`
- 修改：所有引用 `item.unit`、`item.cost`、`item.suggestedPar` 的地方

### 步骤 4.1：移除 deprecated 字段声明

```diff
export interface DraftInventoryItem {
    // ...
    quantityUnit?: string;
    unitCost?: number;
    minStockLevel?: number;
    
-   // @deprecated - 向後兼容，將在遷移後移除
-   unit?: string;
-   cost?: number;
-   suggestedPar?: number;
}
```

### 步骤 4.2：更新所有引用

搜索并替换：
- `item.unit` → `item.quantityUnit`
- `item.cost` → `item.unitCost`
- `item.suggestedPar` → `item.minStockLevel`

影响文件：
- `Stage3Cleanse.tsx` (约 5 处)
- `Stage4Commit.tsx` (约 2 处)
- `SaveAsTemplateModal.tsx` (约 3 处)
- `ExcelPreview.tsx` (约 2 处)

---

## 任务 5: 合并 Locations/Categories 到 Cleanse

**文件：**
- 删除：`components/setup/Stage3Locations.tsx`
- 删除：`components/setup/Stage3Categories.tsx`
- 修改：`components/setup/Stage3Cleanse.tsx`
- 修改：`components/setup/index.ts`

### 步骤 5.1：在 Stage3Cleanse 添加快速添加功能

在 Cleanse 页面顶部添加 "Quick Add Category" 和 "Quick Add Location" 下拉菜单：

```typescript
// 新增: 快速添加 Category/Location 区域
<div className="flex gap-4 mb-4">
  <div className="flex items-center gap-2">
    <input type="text" placeholder="New Category" ... />
    <button onClick={handleAddCategory}>+ Add</button>
  </div>
  <div className="flex items-center gap-2">
    <input type="text" placeholder="New Location" ... />
    <select value={newLocType} onChange={...}>
      {LOCATION_TYPES.map(t => <option key={t}>{t}</option>)}
    </select>
    <button onClick={handleAddLocation}>+ Add</button>
  </div>
</div>
```

### 步骤 5.2：删除独立的 Stage 组件

从 `index.ts` 移除导出。

---

## 任务 6: 保留 Location Type 信息

**文件：**
- 修改：`components/setup/SaveAsTemplateModal.tsx:37-39`

### 步骤 6.1：修改 locations 生成逻辑

```typescript
// 需要从 DraftLocation 获取完整信息
// 但当前 items 中只有 location name，没有 type
// 需要传入 draftLocations 作为 prop

interface SaveAsTemplateModalProps {
  items: DraftInventoryItem[];
  draftLocations: DraftLocation[];  // 🆕 新增
  // ...
}

const locations: TemplateLocation[] = draftLocations.map(loc => ({
  name: loc.name,
  type: loc.type,  // 保留原始类型
}));
```

---

## 任务 7: Levenshtein 算法优化

**文件：**
- 修改：`components/setup/Stage3Cleanse.tsx:13-52`

### 步骤 7.1：添加 memoization

```typescript
// 使用 Map 缓存计算结果
const levenshteinCache = new Map<string, number>();

const levenshtein = (a: string, b: string): number => {
  const key = `${a}|${b}`;
  if (levenshteinCache.has(key)) {
    return levenshteinCache.get(key)!;
  }
  
  // ... 原始计算 ...
  
  levenshteinCache.set(key, result);
  levenshteinCache.set(`${b}|${a}`, result);  // 对称
  return result;
};
```

---

## 验证计划

### 手动测试

> ⚠️ 当前项目没有测试框架配置。建议添加 Vitest 用于单元测试。

**测试 1: Photo Scan 多图**
1. 打开 Setup Wizard
2. 选择 "Photo Scan" 方式
3. 上传 2-3 张发票/收据照片
4. 点击 "Start AI Scan"
5. 验证：所有照片的物品都被识别出来

**测试 2: Excel xlsx 导入**
1. 准备一个 `.xlsx` 文件（包含 Name, Category, Unit 列）
2. 打开 Setup Wizard → Excel/CSV
3. 上传 `.xlsx` 文件
4. 验证：数据正确解析，预览表格显示正确

**测试 3: 步骤指示器**
1. 打开 Setup Wizard
2. 验证：顶部显示 3 个连续步骤 (Import → Clean → Confirm)
3. 完成每个阶段，验证指示器正确更新

**测试 4: Clean 页面快速添加**
1. 进入 Clean 步骤
2. 使用 "Quick Add Category" 添加新分类
3. 使用 "Quick Add Location" 添加新位置
4. 验证：下拉菜单中出现新选项

---

## 执行顺序建议

1. **任务 4** (移除 deprecated) - 基础清理，影响面广但改动简单
2. **任务 2** (xlsx 支持) - 独立任务，快速完成
3. **任务 3 + 5** (步骤重构 + 合并) - 同时进行，相互依赖
4. **任务 1** (多图分析) - 需要测试 Gemini API
5. **任务 6** (Location Type) - 简单修复
6. **任务 7** (Levenshtein) - 性能优化，最后做
