import React from 'react';
import { AbsoluteFill } from 'remotion';

export const CaptionOverlay: React.FC<{ caption: string }> = ({ caption }) => (
  <AbsoluteFill
    style={{
      justifyContent: 'flex-end',
      padding: 48,
      background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.7) 100%)',
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        fontSize: 28,
        color: 'white',
        textAlign: 'center',
        maxWidth: 900,
      }}
    >
      {caption}
    </div>
  </AbsoluteFill>
);
