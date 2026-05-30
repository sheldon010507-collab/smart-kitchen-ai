# Smart Kitchen AI - Remotion Implementation Architecture

> **First Principle**: **Code as Video**.
> We translate the "Visual Language" (Gemini Minimalist) into **React Components** and the "Motion Logic" (BOH OS Flow) into **Remotion Primitives** (`interpolate`, `spring`, `Sequence`).

---

## 🏗️ Project Structure

```typescript
src/
├── compositions/
│   ├── MainVideo.tsx       // Root composition
│   ├── Intro/
│   │   ├── OpeningLogo.tsx // "The Spark"
│   │   └── ChaosScene.tsx  // "It doesn't have to be messy"
│   ├── Features/
│   │   ├── SmartSetup.tsx  // "Smart Fill"
│   │   ├── VisualScan.tsx  // "Vision to Data"
│   │   └── AutoPurchase.tsx// "Neural Link"
│   ├── Ecosystem/
│   │   ├── EcosystemMontage.tsx // Unified OS Flow
│   │   └── DashboardSync.tsx    // Multi-device Sync
│   └── Outro/
│   │   └── ClosingLogo.tsx // "The Totem"
├── components/
│   ├── ui/                 // Reusable UI atoms (Cards, Lists, Buttons)
│   ├── effects/            // GeminiScanline, TetherLine, NeuralNet
│   └── icons/              // ChefHat, KitchenTools
└── lib/
    ├── constants.ts        // Colors, Fonts, Timing
    └── animations.ts       // Reusable spring configs, easings
```

---

## 🎬 Composition Walkthrough

### 1. Root Composition (`MainVideo.tsx`)
*   **FPS**: 60
*   **Resolution**: 1920x1080 (Landscape)
*   **DurationInFrames**: 3 * 60 * 60 = 10800 (approx 3 mins)

### 2. Opening: "The Spark" (`OpeningLogo.tsx`)
*   **Logic**: `width` interpolation from 0 to 100%, `strokeDashoffset` for drawing.
*   **Logo**: 使用品牌 Logo **厨师帽（Chef Hat）**，置于 `public/assets/chef-hat.png`（或 SVG）。

### 3. Scene 1: Chaos to Order (`ChaosScene.tsx`)
*   **Logic**: `AbsoluteFill` layers. `Scanline` component moving across X axis.
*   **Transition**: As `scanlineX` passes an object's X position, switch opacity from `ChaosLayer` to `OrderLayer`.

### 4. Scene 3: Vision to Data (`VisualScan.tsx`)
*   **Logic**: Tether Line 动画，manual interpolation。

### 5. Outro: The Totem (`ClosingLogo.tsx`)
*   **Logic**: 3 设备向中心汇聚 → 替换为 **Chef Hat Logo** + "Smart Kitchen - Your Kitchen OS"。

---

## 🎨 Styling & Assets

*   **Colors**: `constants.ts`（interpolations）、tailwind：`brand-bg`、`gemini-gradient`。
*   **Fonts**: `@remotion/google-fonts`（如 Inter）。
*   **品牌 Logo**：厨师帽（Chef Hat）为项目 Logo，置于 `video-demo/public/assets/chef-hat.png`（或 `.svg`），在 OpeningLogo、ClosingLogo 中统一使用。

## 🛠️ Execution Checklist

- [ ] Remotion 项目位于 `video-demo/`
- [ ] Copy Chef Hat logo to `video-demo/public/assets/chef-hat.png`
- [ ] Folder 名称仅含 a-z、A-Z、0-9、`-`（Remotion 限制）
- [ ] 先实现 OpeningLogo 校验风格，再 ChaosScene / ClosingLogo
