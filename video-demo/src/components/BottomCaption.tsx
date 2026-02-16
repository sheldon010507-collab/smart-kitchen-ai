import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export type BottomCaptionProps = {
  text: string;
  fadeInRange: [number, number];
  bottom?: number;
  color?: string;
  size?: string;
};

export const BottomCaption: React.FC<BottomCaptionProps> = ({
  text,
  fadeInRange,
  bottom = 120,
  color = 'text-gray-800',
  size = 'text-4xl',
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, fadeInRange, [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom,
        width: '100%',
        textAlign: 'center',
        opacity,
      }}
    >
      <h2 className={`${size} font-medium ${color}`}>{text}</h2>
    </div>
  );
};
