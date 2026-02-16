import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { CaptionOverlay } from './CaptionOverlay';

export type ImageMontageProps = {
  /** 圖片路徑列表，相對於 public/，如 ["footage/01-hook/01.jpg", ...] */
  images: string[];
  /** 每張圖顯示的幀數（默認約 1.5 秒/張 @30fps） */
  framesPerImage?: number;
  /** 可選：結尾文案疊加 */
  caption?: string;
};

/**
 * 圖片蒙太奇：多張圖按序切換，僅淡入淡出，無縮放
 */
export const ImageMontage: React.FC<ImageMontageProps> = ({
  images,
  framesPerImage = 45,
  caption,
}) => {
  return (
    <AbsoluteFill>
      {images.map((src, i) => (
        <Sequence key={i} from={i * framesPerImage} durationInFrames={framesPerImage} name={`img-${i + 1}`}>
          <SingleImageWithTransition src={src} durationInFrames={framesPerImage} />
        </Sequence>
      ))}
      {caption ? <CaptionOverlay caption={caption} /> : null}
    </AbsoluteFill>
  );
};

const SingleImageWithTransition: React.FC<{
  src: string;
  durationInFrames: number;
}> = ({ src, durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Img
        src={src?.startsWith('http') ? src : staticFile(src ?? '')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};
