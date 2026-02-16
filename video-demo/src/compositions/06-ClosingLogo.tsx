import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, useVideoConfig } from 'remotion';
import { COLORS, TYPOGRAPHY, GEMINI_GRADIENT, LINE_WIDTH, EASING_OUT_EASE } from '../lib/constants';
import { SEGMENTS } from '../timeline';
import { ChefHat } from 'lucide-react';

/**
 * 7. Closing — "The Totem"
 * Devices Collapse -> Morph into Chef Hat -> Text Lockup
 */

const TOTAL_FRAMES = SEGMENTS.conclusion.durationFrames;

export const ClosingLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // 1. Devices Collapse Configuration
  // We reuse the visual setup from scene 6 but simplify to rectangles for morphing
  const collapseStart = 10;
  const collapseProgress = interpolate(frame, [collapseStart, collapseStart + 30], [0, 1], {
    easing: Easing.bezier(0.6, 0.0, 0.2, 1), // Anticipate
    extrapolateRight: 'clamp',
  });

  // 2. Morph / Explosion
  const morphTrigger = collapseStart + 28;
  const showLogo = frame > morphTrigger;

  // 3. Logo Reveal
  const logoScale = interpolate(frame, [morphTrigger, morphTrigger + 20], [0.5, 1], {
    easing: Easing.elastic(1),
  });
  const logoOpacity = interpolate(frame, [morphTrigger, morphTrigger + 10], [0, 1]);

  // 4. Text Reveal
  const textY = interpolate(frame, [morphTrigger + 10, morphTrigger + 40], [20, 0], {
    easing: EASING_OUT_EASE,
    extrapolateRight: 'clamp',
  });
  const textOpacity = interpolate(frame, [morphTrigger + 10, morphTrigger + 40], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // 5. Final Vignette
  const vignetteOpacity = interpolate(frame, [TOTAL_FRAMES - 40, TOTAL_FRAMES], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>

      {/* PHASE 1: DEVICES COLLAPSING */}
      {!showLogo && (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Left Device (Tablet) */}
          <div style={{
            position: 'absolute',
            width: 300, height: 400,
            backgroundColor: '#1f2937', // gray-800
            borderRadius: 24,
            transform: `translateX(${interpolate(collapseProgress, [0, 1], [-400, 0])}px) scale(${interpolate(collapseProgress, [0, 1], [1, 0.2])})`,
            opacity: 1 - collapseProgress,
          }} />

          {/* Right Device (Laptop) */}
          <div style={{
            position: 'absolute',
            width: 500, height: 350,
            backgroundColor: '#374151', // gray-700
            borderRadius: 16,
            transform: `translateX(${interpolate(collapseProgress, [0, 1], [400, 0])}px) scale(${interpolate(collapseProgress, [0, 1], [1, 0.2])})`,
            opacity: 1 - collapseProgress,
          }} />

          {/* Center Device (Phone) - The Anchor */}
          <div style={{
            position: 'absolute',
            width: 200, height: 400,
            backgroundColor: '#111827', // gray-900
            borderRadius: 32,
            zIndex: 10,
            transform: `scale(${interpolate(collapseProgress, [0, 1], [1, 0.0])})`,
            opacity: 1 - collapseProgress,
          }} />
        </div>
      )}

      {/* PHASE 2: LOGO REVEAL */}
      <div style={{
        opacity: showLogo ? logoOpacity : 0,
        transform: `scale(${logoScale})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}>
        {/** Chef Hat Icon - Reusing SVG or Lucide */}
        <div className="relative">
          {/* Glow behind */}
          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 transform scale-150" />

          <ChefHat size={180} strokeWidth={1} className="text-gray-900 relative z-10" />
        </div>

        <div style={{
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
          textAlign: 'center',
        }}>
          <h1 className="text-6xl font-bold text-gray-900 tracking-tight mb-2" style={{ fontFamily: 'Inter' }}>Smart Kitchen</h1>
          <p className="text-2xl text-gray-500 font-medium tracking-wide uppercase">Your Kitchen OS</p>
        </div>
      </div>

      {/* FINAL VIGNETTE FADE OUT */}
      <AbsoluteFill style={{
        background: 'radial-gradient(circle at center, transparent 0%, black 100%)',
        opacity: vignetteOpacity,
        pointerEvents: 'none',
      }} />

      {/* Total Blackout at very end */}
      <AbsoluteFill style={{
        backgroundColor: 'black',
        opacity: interpolate(frame, [TOTAL_FRAMES - 10, TOTAL_FRAMES], [0, 1]),
      }} />

    </AbsoluteFill>
  );
};
