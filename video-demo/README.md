# Smart Kitchen AI - 產品演示視頻 (Remotion)

使用 [Remotion](https://www.remotion.dev/) 製作的 3 分鐘產品演示視頻項目，與根目錄下策劃方案對應。

## 項目結構

```
video-demo/
├── public/
│   └── footage/          # 放已拍好的視頻（01-hook.mp4 … 06-conclusion.mp4）
├── src/
│   ├── index.ts          # Remotion 入口
│   ├── Root.tsx          # 註冊所有 Composition（成片 + 各段落）
│   ├── timeline.ts       # 時間軸常數（FPS、各段時長）
│   ├── components/
│   │   └── SceneWithCaption.tsx   # 單段：視頻 + 可選文案疊加
│   └── compositions/
│       ├── 01-HookScene.tsx      # 開場
│       ├── 02-SmartSetupScene.tsx
│       ├── 03-VisualInventoryScene.tsx
│       ├── 04-AutoPurchaseScene.tsx
│       ├── 05-EcosystemScene.tsx
│       └── 06-ConclusionScene.tsx
├── VIDEO_PLAN.md         # 腳本與時間軸摘要
├── remotion.config.ts
└── package.json
```

## 快速開始

1. **安裝依賴**
   ```bash
   cd video-demo && npm install
   ```

2. **放入素材**  
   將拍好的視頻按 `public/footage/README.md` 的說明放到 `public/footage/`，命名為 `01-hook.mp4` … `06-conclusion.mp4`。

3. **預覽**
   ```bash
   npm run dev
   ```
   在 Remotion Studio 左側選擇 **Smart Kitchen AI 演示 / SmartKitchenDemo** 預覽成片，或選擇單個段落（如 `01-Hook`）逐段編輯。

4. **導出視頻**
   ```bash
   npm run render
   ```
   輸出在 `out/smart-kitchen-demo.mp4`。

## 自定義

- 修改某段文案：編輯對應 `src/compositions/0x-XXXScene.tsx` 中的 `caption`。
- 某段使用不同文件或路徑：在 Studio 中該 Composition 的 **Props** 裡改 `src`（或改組件 `defaultProps`）。
- 調整時長：改 `src/timeline.ts` 的 `SEGMENTS`，並確保各段 `durationInFrames` 與 Root 中的 `Sequence` 一致。

詳細腳本與段落說明見 `VIDEO_PLAN.md`。
