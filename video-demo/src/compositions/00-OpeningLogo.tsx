import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { GEMINI_GRADIENT, COLORS, LINE_WIDTH, EASING_OUT_EASE, EASING_SMOOTH_BEZIER } from '../lib/constants';

/**
 * Opening: "The Spark" — 視覺與動效設計規範
 * Ignition → Draw 極簡廚師帽線條 → Fill 白+光暈 → "Smart Kitchen" Slide Reveal（右側滑出）
 */
const HAT_PATH_LENGTH = 1000; // Approximate length

export const OpeningLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Ignition: Pixel spark
  const ignitionOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
    easing: EASING_OUT_EASE,
  });

  const ignitionScale = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.elastic(1),
  });

  // 2. expansion to line / starting draw position
  // We'll skip the horizontal line expansion and go straight to drawing the hat as per new spec v5
  // "Draw: 光點以極快的速度繪製出一個 極簡線條的廚師帽"

  const drawStartFrame = 15;
  const drawDuration = 45;
  const drawProgress = interpolate(frame, [drawStartFrame, drawStartFrame + drawDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASING_SMOOTH_BEZIER,
  });

  const strokeOffset = HAT_PATH_LENGTH * (1 - drawProgress);

  // 3. Fill: Solid white
  const fillStartFrame = drawStartFrame + drawDuration - 10;
  const fillOpacity = interpolate(frame, [fillStartFrame, fillStartFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 4. Glow
  const glowOpacity = interpolate(frame, [fillStartFrame, fillStartFrame + 20], [0, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 5. Text Reveal
  const textStartFrame = fillStartFrame + 5;
  const textSlideX = interpolate(frame, [textStartFrame, textStartFrame + 30], [-20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASING_OUT_EASE,
  });
  const textOpacity = interpolate(frame, [textStartFrame, textStartFrame + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.black,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ position: 'relative', width: 400, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>

        {/* Ignition Dot - Initial spark center */}
        <div
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: GEMINI_GRADIENT,
            boxShadow: `0 0 24px 6px ${COLORS.googleBlue}`,
            opacity: ignitionOpacity * (1 - drawProgress), // Hide as it starts drawing
            transform: `scale(${ignitionScale})`,
            zIndex: 10,
          }}
        />

        {/* The Chef Hat SVG */}
        <svg
          width={200}
          height={200}
          viewBox="0 0 24 24"
          fill="none"
          stroke="url(#gemini-gradient)"
          strokeWidth={LINE_WIDTH * 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: `drop-shadow(0 0 ${10 * glowOpacity}px rgba(255,255,255,${glowOpacity}))`,
          }}
        >
          <defs>
            <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={COLORS.gemini.blue} />
              <stop offset="50%" stopColor={COLORS.gemini.purple} />
              <stop offset="100%" stopColor={COLORS.gemini.coral} />
            </linearGradient>
          </defs>

          {/* Chef Hat Path */}
          <path
            d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"
            style={{
              strokeDasharray: HAT_PATH_LENGTH,
              strokeDashoffset: strokeOffset,
              fill: COLORS.white,
              fillOpacity: fillOpacity,
            }}
          />
        </svg>

        {/* Text */}
        <h1
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 42,
            fontWeight: 700,
            color: COLORS.white,
            marginTop: 24,
            opacity: textOpacity,
            transform: `translateY(${textSlideX}px)`, // Sliding up slightly
            letterSpacing: '-0.02em',
          }}
        >
          Smart Kitchen
        </h1>
      </div>
    </AbsoluteFill>
  );
};
