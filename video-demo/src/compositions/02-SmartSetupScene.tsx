import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, useVideoConfig } from 'remotion';
import { COLORS, TYPOGRAPHY, EASING_OUT_EASE, EASING_BACK_OUT } from '../lib/constants';
import { SEGMENTS } from '../timeline';
import { Check, ChevronRight, Package, Coffee, Egg, Milk, Wheat } from 'lucide-react';
import { BottomCaption } from '../components/BottomCaption';

/**
 * 2. Smart Fill — "The Cascade"
 * Setup Wizard -> Click "Modern Cafe" -> List populates with cascade effect
 */

const TOTAL_FRAMES = SEGMENTS.smartSetup.durationFrames;

const INGREDIENTS = [
  { name: 'Organic Whole Milk', category: 'Dairy', icon: Milk, stock: '12 Gal' },
  { name: 'Espresso Beans', category: 'Pantry', icon: Coffee, stock: '5 kg' },
  { name: 'Free Range Eggs', category: 'Dairy', icon: Egg, stock: '150 pcs' },
  { name: 'Artisan Flour', category: 'Pantry', icon: Wheat, stock: '25 kg' },
  { name: 'Avocados', category: 'Produce', icon: Package, stock: '40 pcs' },
  { name: 'Sourdough Bread', category: 'Bakery', icon: Package, stock: '15 loaves' },
  { name: 'Almond Milk', category: 'Dairy', icon: Milk, stock: '8 Gal' },
  { name: 'Vanilla Syrup', category: 'Pantry', icon: Coffee, stock: '6 btl' },
];

export const SmartSetupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Initial State: Setup Wizard Card
  const cardOpacity = interpolate(frame, [0, 10], [0, 1]);
  const cardScale = interpolate(frame, [0, 15], [0.9, 1], { easing: EASING_OUT_EASE });

  // 2. Click Action
  const clickFrame = 40;
  const isClicked = frame > clickFrame;

  // ripple effect on click
  const rippleScale = interpolate(frame, [clickFrame, clickFrame + 20], [0, 4], {
    extrapolateRight: 'clamp',
  });
  const rippleOpacity = interpolate(frame, [clickFrame, clickFrame + 20], [0.5, 0], {
    extrapolateRight: 'clamp',
  });

  // 3. List Cascade
  // The list appears AFTER the setup card fades out/transforms
  const listStartFrame = clickFrame + 15;

  // Transition: Setup Card moves up and fades out
  const setupCardY = interpolate(frame, [listStartFrame, listStartFrame + 20], [0, -50], { extrapolateRight: 'clamp' });
  const setupCardOpacity = interpolate(frame, [listStartFrame, listStartFrame + 20], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.gray[100], alignItems: 'center', justifyContent: 'center' }}>

      {/* SETUP WIZARD CARD */}
      <div style={{
        width: 600,
        padding: 40,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        opacity: setupCardOpacity,
        transform: `scale(${cardScale}) translateY(${setupCardY}px)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        position: 'absolute',
      }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Package size={24} />
          </div>
          <div>
            <h2 style={{ fontFamily: TYPOGRAPHY.fontFamily, fontWeight: 700, fontSize: 24 }}>Kitchen Setup</h2>
            <p className="text-gray-500">Choose your template</p>
          </div>
        </div>

        <div style={{
          border: `2px solid ${isClicked ? COLORS.googleBlue : COLORS.gray[200]}`,
          backgroundColor: isClicked ? '#EFF6FF' : COLORS.white,
          padding: 24,
          borderRadius: 16,
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s',
        }}>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-lg">Modern Cafe</span>
            {isClicked ? <Check size={24} color={COLORS.googleBlue} /> : <ChevronRight size={24} color={COLORS.gray[400]} />}
          </div>
          <p className="text-gray-500 text-sm mt-1">Pre-loaded with 350+ items</p>

          {/* Ripple */}
          {frame >= clickFrame && (
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: 100, height: 100,
              background: COLORS.googleBlue,
              borderRadius: '50%',
              transform: `translate(-50%, -50%) scale(${rippleScale})`,
              opacity: rippleOpacity,
              pointerEvents: 'none',
            }} />
          )}
        </div>

        <div className="p-6 border border-gray-200 rounded-xl opacity-50">
          <span className="font-semibold text-lg text-gray-400">Fine Dining</span>
        </div>
      </div>

      {/* THE CASCADE LIST */}
      <div style={{
        position: 'absolute',
        width: 800,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        top: 200,
      }}>
        {INGREDIENTS.map((item, index) => {
          const itemStartFrame = listStartFrame + 5 + (index * 4); // Stagger by 4 frames

          const itemOpacity = interpolate(frame, [itemStartFrame, itemStartFrame + 10], [0, 1], { extrapolateRight: 'clamp' });
          const itemY = interpolate(frame, [itemStartFrame, itemStartFrame + 15], [30, 0], {
            extrapolateRight: 'clamp',
            easing: EASING_BACK_OUT
          });

          // Flash effect
          const flashOpacity = interpolate(frame, [itemStartFrame, itemStartFrame + 5, itemStartFrame + 15], [0, 0.5, 0], { extrapolateRight: 'clamp' });

          if (frame < itemStartFrame) return null;

          return (
            <div key={index} style={{
              backgroundColor: COLORS.white,
              padding: '16px 24px',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: itemOpacity,
              transform: `translateY(${itemY}px)`,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600">
                  <item.icon size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">{item.category}</span>
                </div>
              </div>
              <span className="font-mono text-gray-600 bg-gray-50 px-3 py-1 rounded">{item.stock}</span>

              {/* Flash Highlight */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: COLORS.brandGreen,
                opacity: flashOpacity,
                mixBlendMode: 'overlay',
              }} />
            </div>
          );
        })}
      </div>

      {/* On-screen Text */}
      <BottomCaption text="One click. Ready." fadeInRange={[clickFrame + 20, clickFrame + 50]} bottom={150} />
    </AbsoluteFill>
  );
};
