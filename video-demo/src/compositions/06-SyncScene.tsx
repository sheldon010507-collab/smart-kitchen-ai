import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, useVideoConfig, Img, staticFile } from 'remotion';
import { COLORS, EASING_SMOOTH_BEZIER } from '../lib/constants';
import { SEGMENTS } from '../timeline';
import { Laptop, Smartphone, Tablet } from 'lucide-react';
import { BottomCaption } from '../components/BottomCaption';

/**
 * 6. Sync Scene — "The Zoom Out"
 * Start on Phone UI -> Zoom out to reveal Tablet & Laptop -> All Wink
 */

const TOTAL_FRAMES = SEGMENTS.sync.durationFrames;

export const SyncScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // 1. Zoom Out Animation
  // Start with scale 3 (focused on phone center) -> scale 1 (full view)
  const zoomProgress = interpolate(frame, [0, 40], [0, 1], { easing: EASING_SMOOTH_BEZIER });
  const scale = interpolate(zoomProgress, [0, 1], [3.5, 1]);

  // 2. Wink Animation (Sync)
  const winkStart = 50;
  const winkOpacity = interpolate(frame, [winkStart, winkStart + 10, winkStart + 20], [0, 1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>

      {/* Main Transform Container */}
      <div style={{
        display: 'flex',
        alignItems: 'end',
        justifyContent: 'center',
        gap: 60,
        transform: `scale(${scale})`,
        transformOrigin: '50% 60%', // Focus roughly where the phone is initially (center-ish)
      }}>

        {/* TABLET (Left) */}
        <div className="relative w-[400px] h-[550px] bg-gray-800 rounded-[32px] border-8 border-gray-900 shadow-2xl overflow-hidden flex flex-col items-center justify-center">
          <div className="bg-white w-full h-full p-4 flex flex-col">
            <div className="h-8 bg-gray-100 rounded mb-4 w-1/3" />
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg" />
              <div className="bg-gray-50 rounded-lg" />
              <div className="bg-gray-50 rounded-lg" />
              <div className="bg-gray-50 rounded-lg" />
            </div>
          </div>
        </div>

        {/* PHONE (Center - Initial Focus) */}
        <div className="relative w-[280px] h-[550px] bg-black rounded-[40px] border-8 border-gray-900 shadow-2xl overflow-hidden z-10">
          <div className="bg-white w-full h-full p-4 flex flex-col pt-12">
            <div className="h-6 bg-gray-100 rounded mb-6 w-1/2 self-center" />
            <div className="space-y-3">
              <div className="h-16 bg-green-50 rounded-xl border border-green-100" />
              <div className="h-16 bg-gray-50 rounded-xl" />
              <div className="h-16 bg-gray-50 rounded-xl" />
              <div className="h-16 bg-gray-50 rounded-xl" />
            </div>
          </div>
        </div>

        {/* LAPTOP (Right) */}
        <div className="relative w-[700px] h-[450px] bg-gray-200 rounded-t-2xl border-t-8 border-x-8 border-gray-800 shadow-2xl flex flex-col items-center justify-end">
          {/* Screen */}
          <div className="bg-white w-full h-full border-b-[20px] border-gray-800 p-8 flex">
            <div className="w-1/4 h-full bg-gray-50 border-r border-gray-100" />
            <div className="w-3/4 h-full p-4 grid grid-cols-3 gap-4">
              <div className="h-32 bg-gray-100 rounded-lg col-span-2" />
              <div className="h-32 bg-blue-50 rounded-lg" />
              <div className="h-64 bg-gray-50 rounded-lg col-span-3" />
            </div>
          </div>
          {/* Base */}
          <div className="w-[800px] h-[20px] bg-gray-800 rounded-b-xl -mb-[20px]" />
        </div>
      </div>

      {/* Winking Logos Overlay */}
      {/* Simulating the "Sync" light on all devices */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: '50% 60%' }}>
          {/* Overlaying green lights on the devices */}
          {[-350, 0, 350].map((left) => (
            <div key={left} className="absolute top-[100px] w-4 h-4 bg-green-400 rounded-full shadow-[0_0_20px_#4ade80]" style={{ left, opacity: winkOpacity }} />
          ))}
        </div>
      </AbsoluteFill>

      {/* On-screen Text */}
      <BottomCaption text="All in one place." fadeInRange={[40, 60]} bottom={150} />

    </AbsoluteFill>
  );
};
