import React from 'react';
import { ImageMontage } from '../components/ImageMontage';

/** 開場：直擊痛點 — 雜亂廚房圖片蒙太奇 */
const HOOK_CAPTION =
  "Too much paper, too much waste, too much chaos—it doesn't have to be.";

/** 01-hook 資料夾內的圖片（按序），請放在 public/footage/01-hook/ 並命名為 01.png～06.png */
const HOOK_IMAGES = [
  'footage/01-hook/01.png',
  'footage/01-hook/02.png',
  'footage/01-hook/03.png',
  'footage/01-hook/04.png',
  'footage/01-hook/05.png',
  'footage/01-hook/06.png',
];

/** 每張圖 1 秒 */
const FRAMES_PER_IMAGE = 60; // 1 * 60fps

export const HookScene: React.FC<{ images?: string[]; caption?: string }> = ({
  images = HOOK_IMAGES,
  caption = HOOK_CAPTION,
}) => (
  <ImageMontage
    images={images}
    framesPerImage={FRAMES_PER_IMAGE}
    caption={caption}
  />
);
