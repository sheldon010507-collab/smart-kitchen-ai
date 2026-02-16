import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { GEMINI_GRADIENT_VERTICAL, COLORS } from '../lib/constants';
import { SEGMENTS } from '../timeline';
import { FileText, Calculator, Receipt, AlertCircle, Coffee, Clock } from 'lucide-react';
import { BottomCaption } from '../components/BottomCaption';

/**
 * 1. Chaos to Order — "The Scan of Clarity"
 */

const TOTAL_FRAMES = SEGMENTS.chaos.durationFrames;

const ScatteredIcon = ({ icon: Icon, x, y, rotate, scale, delay }: any) => {
  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `rotate(${rotate}deg) scale(${scale})`,
      opacity: 0.6,
      color: COLORS.gray[800],
    }}>
      <Icon size={64} strokeWidth={1.5} />
    </div>
  );
}

export const ChaosScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const scanX = interpolate(frame, [0, TOTAL_FRAMES * 0.8], [0, width], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Generate some static random positions (deterministic for React)
  const items = [
    { Icon: FileText, x: 200, y: 150, r: -15, s: 1.2 },
    { Icon: Calculator, x: 500, y: 300, r: 10, s: 1 },
    { Icon: Receipt, x: 800, y: 100, r: -5, s: 1.1 },
    { Icon: AlertCircle, x: 300, y: 600, r: 20, s: 1.5 },
    { Icon: Coffee, x: 1000, y: 500, r: -10, s: 0.9 },
    { Icon: Clock, x: 1400, y: 200, r: 5, s: 1.3 },
    { Icon: FileText, x: 1200, y: 700, r: -25, s: 1 },
    { Icon: Receipt, x: 600, y: 800, r: 30, s: 1.4 },
    // Add more clutter
    { Icon: Calculator, x: 1600, y: 400, r: -15, s: 1.1 },
    { Icon: FileText, x: 100, y: 800, r: 45, s: 0.8 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.white }}>
      {/* Layer 1: Chaos (Visible on RIGHT of scanline - wait, spec says Chaos -> Order, 
         so Chaos is the START state.
         Scanline moves Left -> Right.
         Left of scanline = Order (Revealed).
         Right of scanline = Chaos (Remaining).
      */}

      {/* CHAOS LAYER (Right Side) */}
      <AbsoluteFill
        style={{
          clipPath: `inset(0 0 0 ${scanX}px)`, // Show from scanX to width
          backgroundColor: '#f0f0f0', // Slight dirty bg
        }}
      >
        {items.map((item, idx) => (
          <ScatteredIcon
            key={idx}
            icon={item.Icon}
            x={item.x} y={item.y}
            rotate={item.r}
            scale={item.s}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h2 className="text-6xl font-bold text-gray-400 opacity-20 transform -rotate-12">CHAOS</h2>
        </div>
      </AbsoluteFill>

      {/* ORDER LAYER (Left Side - Revealed) */}
      <AbsoluteFill
        style={{
          clipPath: `inset(0 ${width - scanX}px 0 0)`, // Show from 0 to scanX
          backgroundColor: COLORS.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 32,
            padding: 64,
            width: '80%',
          }}
        >
          {/* Organized Cards */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col p-6 h-48"
            >
              <div className="w-12 h-12 rounded-full bg-gray-50 mb-4" />
              <div className="h-4 w-3/4 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-1/2 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </AbsoluteFill>

      {/* The Scanline */}
      <div
        style={{
          position: 'absolute',
          left: scanX,
          top: 0,
          width: 2,
          height: '100%',
          background: GEMINI_GRADIENT_VERTICAL,
          boxShadow: '0 0 20px 4px rgba(66,133,244,0.3)',
          zIndex: 10,
        }}
      />

      {/* On-screen Text (Fade in after scan) */}
      <BottomCaption text="It doesn't have to be messy." fadeInRange={[TOTAL_FRAMES * 0.5, TOTAL_FRAMES * 0.8]} bottom={100} />

    </AbsoluteFill>
  );
};
