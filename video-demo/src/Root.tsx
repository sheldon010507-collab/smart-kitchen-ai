import React from 'react';
import { Composition, Folder, Sequence } from 'remotion';
import { FPS, SEGMENTS, TOTAL_DURATION_FRAMES } from './timeline';
import { OpeningLogo } from './compositions/00-OpeningLogo';
import { HookScene } from './compositions/01-HookScene';
import { ChaosScene } from './compositions/01-ChaosScene';
import { SmartSetupScene } from './compositions/02-SmartSetupScene';
import { VisualInventoryScene } from './compositions/03-VisualInventoryScene';
import { AutoPurchaseScene } from './compositions/04-AutoPurchaseScene';
import { EcosystemScene } from './compositions/05-EcosystemScene';
import { SyncScene } from './compositions/06-SyncScene';
import { ClosingLogo } from './compositions/06-ClosingLogo';

const WIDTH = 1920;
const HEIGHT = 1080;

function sumFrames(...keys: (keyof typeof SEGMENTS)[]): number {
  return keys.reduce((acc, k) => acc + SEGMENTS[k].durationFrames, 0);
}

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Smart-Kitchen-AI-Demo">
      <Composition
        id="SmartKitchenDemo"
        component={FullDemoComposition}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />

      <Composition
        id="00-OpeningLogo"
        component={OpeningLogo}
        durationInFrames={SEGMENTS.opening.durationFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      {/* Hook: 6 張圖 × 1 秒，文案 "Too much paper, too much waste, too much chaos—it doesn't have to be." */}
      <Composition
        id="01-Hook"
        component={HookScene}
        durationInFrames={6 * 60}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="01-ChaosToOrder"
        component={ChaosScene}
        durationInFrames={SEGMENTS.chaos.durationFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="02-SmartSetup"
        component={SmartSetupScene}
        durationInFrames={SEGMENTS.smartSetup.durationFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="03-VisualInventory"
        component={VisualInventoryScene}
        durationInFrames={SEGMENTS.visualInventory.durationFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="04-AutoPurchase"
        component={AutoPurchaseScene}
        durationInFrames={SEGMENTS.autoPurchase.durationFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="05-Ecosystem"
        component={EcosystemScene}
        durationInFrames={SEGMENTS.ecosystem.durationFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="06-Sync"
        component={SyncScene}
        durationInFrames={SEGMENTS.sync.durationFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="07-ClosingTotem"
        component={ClosingLogo}
        durationInFrames={SEGMENTS.conclusion.durationFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
    </Folder>
  </>
);

/** 完整成片：視覺與動效設計規範 — 60fps，無視頻縮放 */
const FullDemoComposition: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={SEGMENTS.opening.durationFrames} name="00-OpeningLogo">
      <OpeningLogo />
    </Sequence>
    <Sequence
      from={sumFrames('opening')}
      durationInFrames={SEGMENTS.chaos.durationFrames}
      name="01-ChaosToOrder"
    >
      <ChaosScene />
    </Sequence>
    <Sequence
      from={sumFrames('opening', 'chaos')}
      durationInFrames={SEGMENTS.smartSetup.durationFrames}
      name="02-SmartSetup"
    >
      <SmartSetupScene />
    </Sequence>
    <Sequence
      from={sumFrames('opening', 'chaos', 'smartSetup')}
      durationInFrames={SEGMENTS.visualInventory.durationFrames}
      name="03-VisualInventory"
    >
      <VisualInventoryScene />
    </Sequence>
    <Sequence
      from={sumFrames('opening', 'chaos', 'smartSetup', 'visualInventory')}
      durationInFrames={SEGMENTS.autoPurchase.durationFrames}
      name="04-AutoPurchase"
    >
      <AutoPurchaseScene />
    </Sequence>
    <Sequence
      from={sumFrames('opening', 'chaos', 'smartSetup', 'visualInventory', 'autoPurchase')}
      durationInFrames={SEGMENTS.ecosystem.durationFrames}
      name="05-Ecosystem"
    >
      <EcosystemScene />
    </Sequence>
    <Sequence
      from={sumFrames('opening', 'chaos', 'smartSetup', 'visualInventory', 'autoPurchase', 'ecosystem')}
      durationInFrames={SEGMENTS.sync.durationFrames}
      name="06-Sync"
    >
      <SyncScene />
    </Sequence>
    <Sequence
      from={sumFrames('opening', 'chaos', 'smartSetup', 'visualInventory', 'autoPurchase', 'ecosystem', 'sync')}
      durationInFrames={SEGMENTS.conclusion.durationFrames}
      name="07-ClosingTotem"
    >
      <ClosingLogo />
    </Sequence>
  </>
);
