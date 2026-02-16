import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion';
import { CaptionOverlay } from './CaptionOverlay';

export type SceneWithCaptionProps = {
  /** 片段視頻路徑，相對於 public/，例如 "footage/01-hook.mp4" */
  src: string;
  /** 可選文案疊加（與腳本對應） */
  caption?: string;
  /** 是否靜音 */
  muted?: boolean;
};

/**
 * 單個片段：實拍視頻 + 可選字幕疊加
 * 將拍好的視頻放在 public/footage/ 下，src 傳 "footage/xxx.mp4"
 */
export const SceneWithCaption: React.FC<SceneWithCaptionProps> = ({
  src,
  caption,
  muted = false,
}) => {
  const videoSrc = src?.startsWith('http') ? src : staticFile(src ?? '');

  return (
    <AbsoluteFill>
      <OffthreadVideo src={videoSrc} muted={muted} />
      {caption ? <CaptionOverlay caption={caption} /> : null}
    </AbsoluteFill>
  );
};
