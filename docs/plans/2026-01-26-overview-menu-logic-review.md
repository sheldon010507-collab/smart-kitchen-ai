# Overview + Menu 邏輯審核（第一性原理）

**審核範圍**: 截圖中的 Overview 儀表板（Labor Cost, Inventory Value, Avg. Food Cost, Wastage）及 Menu 識別菜單無法編輯問題。

**參考工作流**: systematic-debugging（根因 > 症狀，證據 > 猜測）

---

## 一、Avg. Food Cost 0.0% 邏輯鏈

### 1.1 數據流（第一性原理）

```
menu (useDashboardData)
    ↓
useBatchRecipeCosting(menu, inventory)
    → 從 menu_ingredients 載入配方
    → 計算每個菜品的 realTimeCost → menuCosts
    ↓
useOperationsData.stats
    → menuItemsWithCosts = menu.filter(m => sellingPrice>0 && menuCosts[m.id]>0)
    → avgFoodCost = avg(realCost/sellingPrice) for menuItemsWithCosts
```

### 1.2 根因假設

| 假設 | 描述 | 證據方向 |
|------|------|----------|
| A | **Schema 錯位**: useBatchRecipeCosting 使用 `row.inventory_id`，但 menuService/useDashboardData 使用 `inventory_item_id`，導致 ingredients 載入後 inventoryId 恆為 undefined | 檢查 DB 回傳的 row 欄位名 |
| B | **無配方**: 識別導入的菜單沒有 ingredients（analyzeMenuPhoto 只回傳 name/price/category/estimatedCost），故 menuCosts 全為 null | 掃描項的 ingredients 為空 |
| C | **庫存無單價**: 配方存在但 inventory 的 unitCost 全為 0 或缺失 | 檢查 inventory 的 unitCost |
| D | **useDashboardData 與 useBatchRecipeCosting 來源不一致**: menu 來自 useDashboardData，但 useBatchRecipeCosting 自行查 menu_ingredients，若 ID 格式不同可能對不上 | 比對 menu id 與 ingredients 的 menu_item_id |

### 1.3 已發現的程式問題

- **useBatchRecipeCosting.ts L52-55**: 使用 `row.inventory_id`、`row.ingredient_name`
- **menuService.ts L21, 104**: 使用 `inventory_item_id` 寫入
- **結論**: 若 DB 欄位為 `inventory_item_id`，則 `row.inventory_id` 為 undefined → inventoryId 永遠為空 → 僅能依 ingredientName 匹配，且 menuService 寫入時未包含 ingredient_name → 成本計算失敗

---

## 二、Menu 識別項無法編輯 邏輯鏈

### 2.1 編輯流程

```
MenuItemCard onClick(handleEdit) → onEdit(item) → openEditModal(item)
    ↓
StaffMenuModal(editingItem=item)
    → useEffect 將 item 映射到表單
    → 用戶修改 → handleSubmit → onSave(item)
    ↓
handleStaffSave → onUpdateMenuItem(item)
    ↓
handleUpdateMenuItem (useOperationsData) → menuService.updateMenuItem
```

### 2.2 根因假設

| 假設 | 描述 | 證據方向 |
|------|------|----------|
| A | **行動端按鈕不可見**: Manager/Staff 卡片使用 `opacity-0 group-hover:opacity-100`，觸控裝置無 hover → 編輯按鈕永遠隱藏 | 行動裝置上按鈕是否可見 |
| B | **update 失敗**: menuService.updateMenuItem 因 id/權限/格式錯誤而失敗 | 檢查 API/DB 錯誤日誌 |
| C | **ingredient 映射失敗**: StaffMenuModal 的 DB→UI 映射對識別項（ingredients 為空或格式不同）處理不當 | 檢查 editingItem.ingredients 結構 |
| D | **路由/數據源**: 若在 DashboardPage 而非 OperationsPage，handleUpdateMenuItem 只更新本地 state，不寫入 DB | 確認所在頁面與 handler 來源 |

### 2.3 已發現的程式問題

- **MenuItemCard.tsx L58-59, L105-106**: 編輯/刪除按鈕使用 `opacity-0 group-hover:opacity-100`，在無 hover 的觸控裝置上不會顯示
- **analyzeMenuPhoto**: 回傳項目無 `ingredients`，寫入後該菜品無配方，不影響編輯基本欄位，但需確認編輯表單不會因空 ingredients 出錯

---

## 三、建議修復（待調試驗證後實施）

1. **useBatchRecipeCosting / useRecipeCosting**: 將 `row.inventory_id` 改為 `row.inventory_item_id`（或兼容兩者）
2. **MenuItemCard**: 在觸控裝置上讓編輯/刪除按鈕常駐顯示，例如 `@media (hover: none)` 或 `opacity-100`，或改為點擊卡片展開操作
3. **menu_ingredients**: 確認實際 schema（inventory_item_id vs inventory_id, ingredient_name 是否存在），統一欄位命名
