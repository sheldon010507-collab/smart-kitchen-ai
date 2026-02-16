import React from 'react';
import { ImageMontage } from '../components/ImageMontage';
import { SEGMENTS } from '../timeline';

/** 結尾 — Dashboard 全景、多端同步（手機、平板、電腦）、Logo */
const CONCLUSION_CAPTION =
  'Inventory. Staff. Costing. Menu. All in one place.';

/** 06-conclusion 資料夾內的圖片：手機、平板、電腦（多端同步） */
const CONCLUSION_IMAGES = [
  'footage/06-conclusion/手機.PNG',
  'footage/06-conclusion/平板.PNG',
  'footage/06-conclusion/電腦.PNG',
];

const TOTAL_FRAMES = SEGMENTS.conclusion.durationFrames; // 10 * 60 = 600
const FRAMES_PER_IMAGE = Math.floor(TOTAL_FRAMES / CONCLUSION_IMAGES.length); // 200 ≈ 3.3s/張

export const ConclusionScene: React.FC<{ images?: string[]; caption?: string }> = ({
  images = CONCLUSION_IMAGES,
  caption = CONCLUSION_CAPTION,
}) => (
  <ImageMontage
    images={images}
    framesPerImage={FRAMES_PER_IMAGE}
    caption={caption}
  />
);
