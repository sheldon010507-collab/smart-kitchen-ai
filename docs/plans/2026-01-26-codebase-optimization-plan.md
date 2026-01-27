# 系統性代碼庫優化計劃
> 創建日期: 2026-01-26
> 策略: "絞殺者模式 (Strangler Fig)" 應用遷移

## 🧠 優化分析 (第一性原理)

基於你的工作流和當前架構（`App.tsx` 作為單體狀態容器），原計劃存在一個關鍵的依賴倒置問題：**如果沒有統一的 Context (階段 2)，解耦組件 (階段 1) 將極其困難**。

**優化後的策略**: **地基優先 (Foundation First)**。
我們不是直接拆解 `App.tsx`，而是在它周圍建立 **新基礎設施** (Router + Context)，然後將組件一個接一個地遷移過去。

---

## 📅 優化後的進度表

### 🔴 Phase 0: 準備與安全網 (2 天)
**目標**: 為"大手術"創造一個安全的環境。
*核心 Workflow*: `using-git-worktrees`, `verification-before-completion`

- [ ] **0.1 設置 Worktree**: 隔離重構工作 (`refactor/phase0-prep`)。
- [ ] **0.2 建立驗證基準**:
    - [ ] 添加 `vitest` 基礎配置 (如果缺失)。
    - [ ] 為 `App.tsx` 創建 **快照測試 (Snapshot Test)** (確保 UI 視覺不回退)。
    - [ ] 創建 **冒煙測試 (Smoke Test)** 腳本 (確保主要視圖能成功渲染)。
- [ ] **0.3 審計全局狀態**: 準確記錄 `App.tsx` 中的哪個 `useState` 被哪個子組件使用。

### 🟡 Phase 1: 基礎設施地基 (2-3 天)
**目標**: 在移動代碼之前建立"新世界"的架構。
*核心 Workflow*: `test-driven-development`

- [ ] **1.1 最終化 BusinessContext**: 確保 `BusinessContext` 能完全替代 `App.tsx` 的業務狀態。
- [ ] **1.2 引入 React Router**:
    - 安裝 `react-router-dom`。
    - 創建 `AppRoutes.tsx`。
    - **關鍵步驟**: 創建一個 "兼容性路由" (例如 `/`)，在完全遷移前仍然渲染舊的 `App` 邏輯。
- [ ] **1.3 測試 Providers**: 為 Context Providers 編寫單元測試，確保它們能正確處理狀態更新。

### 🟢 Phase 2: 組件遷移 (絞殺者模式) (3-4 天)
**目標**: 將功能"逐塊"從"舊 App 狀態"遷移到"新 Router/Context"。
*核心 Workflow*: `subagent-driven-development` (每個視圖一個任務)

> **每個視圖 (Inventory, Staff, Menu 等) 的執行循環:**
> 1. **組件重構**: 重構組件以使用 `useBusiness()` 而非 Props。
> 2. **路由定義**: 定義新路由 (例如 `/inventory`)。
> 3. **App.tsx 清理**: 從 `App.tsx` 中移除 `InventoryView` 的渲染邏輯和 Props。
> 4. **驗證**: 測試獨立路由。

- [ ] **2.1 遷移公共頁面** (Login, Privacy Policy) -> 簡單路由。
- [ ] **2.2 遷移 InventoryView** -> 連接到 Context -> 移動到路由。
- [ ] **2.3 遷移 Dashboards** (Restaurant, Master) -> 連接到 Context -> 移動到路由。
- [ ] **2.4 遷移 Modals** -> 將全局模態框移動到 `GlobalModalProvider` 或 Layout 中。

### 🔵 Phase 3: 清理與深層鏈接 (1 天)
**目標**: 拆除腳手架。
*核心 Workflow*: `systematic-debugging`

- [ ] **3.1 移除遺留狀態**: 從 `App.tsx` 中刪除未使用的 `useState` (view, currentBusinessId 等)。
- [ ] **3.2 修復導航**: 確保所有內部鏈接使用 `Link` 或 `useNavigate`。
- [ ] **3.3 深層鏈接驗證**: 驗證刷新 `/inventory/123` 能正確工作。

---

## 🛠️ 執行工作流

### 如何執行一個任務 (例如 "遷移 InventoryView")

1. **檢查計劃**: `subagent-driven-development`
    ```bash
    # 創建功能分支
    git worktree add .worktrees/feat-inventory-migration -b refactor/inventory-migration
    ```
2. **測試優先**: 為 `InventoryView` 編寫測試，Mock `BusinessContext`。
3. **重構**: 從 `InventoryView` 中移除 props，替換為 `useContext` hooks。
4. **路由**: 添加到 `AppRoutes.tsx`。
5. **驗證**: 運行應用，檢查 `/inventory` URL。
6. **合併**: `finishing-a-development-branch`。

## 🚦 下一步

準備好開始 **Phase 0** 了嗎？

1. 我們是否有安裝 `vitest` 或同等測試工具？
2. 我現在執行 `git worktree` 設置嗎？
