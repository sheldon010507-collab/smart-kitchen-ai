/**
 * Smart Kitchen AI 演示視頻時間軸
 * 視覺與動效設計規範：60fps，純粹智能 / Gemini 極簡科技風
 */
export const FPS = 60;
export const TOTAL_DURATION_SEC = 180; // 3 min
export const TOTAL_DURATION_FRAMES = FPS * TOTAL_DURATION_SEC; // 10800

/** 各段落時長（秒）與對應幀數 */
export const SEGMENTS = {
  /** 0. Opening "The Spark" Pre-roll */
  opening: { startSec: 0, endSec: 5, durationSec: 5, durationFrames: 5 * FPS },
  /** 1. Chaos to Order 0:00-0:15 */
  chaos: { startSec: 5, endSec: 20, durationSec: 15, durationFrames: 15 * FPS },
  /** 2. Smart Fill 0:15-0:35 */
  smartSetup: { startSec: 20, endSec: 40, durationSec: 20, durationFrames: 20 * FPS },
  /** 3. Vision to Data 0:35-1:05 */
  visualInventory: { startSec: 40, endSec: 70, durationSec: 30, durationFrames: 30 * FPS },
  /** 4. Neural Link 1:05-1:35 */
  autoPurchase: { startSec: 70, endSec: 100, durationSec: 30, durationFrames: 30 * FPS },
  /** 5. Connected OS 1:35-2:30 */
  ecosystem: { startSec: 100, endSec: 155, durationSec: 55, durationFrames: 55 * FPS },
  /** 6. Sync 2:30-2:50 */
  sync: { startSec: 155, endSec: 170, durationSec: 15, durationFrames: 15 * FPS },
  /** 7. Closing "The Totem" 2:50-3:00 */
  conclusion: { startSec: 170, endSec: 180, durationSec: 10, durationFrames: 10 * FPS },
} as const;

export type SegmentId = keyof typeof SEGMENTS;
