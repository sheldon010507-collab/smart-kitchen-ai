import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, useVideoConfig, Img, staticFile } from 'remotion';
import { COLORS, TYPOGRAPHY, LINE_WIDTH, EASING_SMOOTH_BEZIER, EASING_BACK_OUT } from '../lib/constants';
import { SEGMENTS } from '../timeline';
import { Scan, Box, CheckCircle } from 'lucide-react';
import { BottomCaption } from '../components/BottomCaption';

/**
 * 3. Vision to Data — "The Tether"
 * Scan Milk Bottle -> Bounding Box -> Tether Line -> Inventory Card
 */

const TOTAL_FRAMES = SEGMENTS.visualInventory.durationFrames;

export const VisualInventoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Timeline
  const scanStart = 10;
  const lockFrame = 40; // Lock onto object
  const tetherStart = 45;
  const cardAppear = 50;

  // 1. Camera Feed (Placeholder Background)
  // In a real video, this would be a video file.
  // We'll use a gray background with a "Milk Bottle" placeholder

  // 2. Scan Bounding Box Animation
  const boxScale = interpolate(frame, [scanStart, lockFrame], [1.2, 1], { easing: Easing.out(Easing.cubic) });
  const boxOpacity = interpolate(frame, [scanStart, scanStart + 10], [0, 1]);
  const isLocked = frame >= lockFrame;
  const boxColor = isLocked ? COLORS.brandGreen : COLORS.white;

  // 3. Tether Line Logic
  const bottlePos = { x: width * 0.35, y: height * 0.5 };
  const cardPos = { x: width * 0.75, y: height * 0.5 };

  const tetherProgress = interpolate(frame, [tetherStart, tetherStart + 20], [0, 1], {
    easing: EASING_SMOOTH_BEZIER,
    extrapolateRight: 'clamp'
  });

  // Animate the line end point from bottle (start) to card (end)
  const currentLineEndX = interpolate(tetherProgress, [0, 1], [bottlePos.x + 150, cardPos.x - 200]);
  const currentLineEndY = interpolate(tetherProgress, [0, 1], [bottlePos.y, cardPos.y]);

  // 4. Card Reveal
  const cardScale = interpolate(frame, [cardAppear, cardAppear + 15], [0.8, 1], { easing: EASING_BACK_OUT });
  const cardOpacity = interpolate(frame, [cardAppear, cardAppear + 15], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1a' }}>

      {/* Camera Feed Placeholder */}
      {/* Using a placeholder gradient simulation for camera feed */}
      <AbsoluteFill style={{
        background: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)',
      }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <div style={{
            width: 300, height: 600, border: '2px dashed white', borderRadius: 20
          }} />
        </div>
      </AbsoluteFill>

      {/* SCANNING UI Layer */}
      <AbsoluteFill>
        {/* Bounding Box */}
        <div style={{
          position: 'absolute',
          left: bottlePos.x,
          top: bottlePos.y,
          width: 300,
          height: 400,
          transform: `translate(-50%, -50%) scale(${boxScale})`,
          opacity: boxOpacity,
          border: `4px solid ${boxColor}`,
          borderRadius: 16,
          boxShadow: isLocked ? `0 0 30px ${COLORS.brandGreen}66` : 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 16,
        }}>
          <div className="flex justify-between w-full">
            <Scan size={32} color={boxColor} />
            <span style={{ fontFamily: 'monospace', color: boxColor, fontSize: 18 }}>{isLocked ? 'ID: MILK_ORG_01' : 'SCANNING...'}</span>
          </div>
          {isLocked && (
            <div className="self-end bg-green-500 text-white text-sm px-3 py-1 rounded font-bold shadow-lg">
              98% MATCH
            </div>
          )}
        </div>

        {/* Tether Line (SVG) */}
        {tetherProgress > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
            <line
              x1={bottlePos.x + 150} // Right edge of box
              y1={bottlePos.y}
              x2={currentLineEndX}
              y2={currentLineEndY}
              stroke={COLORS.brandGreen}
              strokeWidth={4}
              strokeDasharray="12 6"
            />
            {/* Moving dot on line endpoint */}
            <circle
              cx={currentLineEndX}
              cy={currentLineEndY}
              r={8}
              fill={COLORS.white}
              stroke={COLORS.brandGreen}
              strokeWidth={4}
            />
          </svg>
        )}

        {/* Data Card */}
        <div style={{
          position: 'absolute',
          left: cardPos.x,
          top: cardPos.y,
          transform: `translate(-50%, -50%) scale(${cardScale})`,
          opacity: cardOpacity,
          zIndex: 20,
        }}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-[400px] flex flex-col gap-6 border-2 border-green-500/20 backdrop-blur-sm bg-opacity-95">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Whole Milk</h2>
                <p className="text-green-600 font-medium">Dairy Category</p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-inner">
                <CheckCircle size={32} />
              </div>
            </div>

            <div className="h-px bg-gray-100 w-full" />

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-xl">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Quantity</span>
                <div className="text-2xl font-mono text-gray-800 font-bold mt-1">0.5 Gal</div>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <span className="text-xs text-red-400 uppercase font-bold tracking-wider">Expiry</span>
                <div className="text-2xl font-mono text-red-600 font-bold mt-1">2 Days</div>
              </div>
            </div>
          </div>
        </div>

        {/* On-screen Text */}
        <BottomCaption text="AI sees what you see." fadeInRange={[cardAppear + 20, cardAppear + 40]} color="text-white" size="text-5xl" />

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
