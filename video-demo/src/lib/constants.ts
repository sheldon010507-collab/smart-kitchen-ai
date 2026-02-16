/**
 * 視覺與動效設計規範 — 常數
 * Core: Pure Intelligence / Gemini Tech Minimalist
 */
import { Easing } from 'remotion';

export const COLORS = {
  black: '#000000',
  white: '#ffffff',
  gray: {
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  googleBlue: '#4285F4',
  brandGreen: '#34A853',
  gemini: {
    blue: '#4285F4',
    purple: '#9B72CB',
    coral: '#D96570',
  },
} as const;

export const GEMINI_GRADIENT = 'linear-gradient(90deg, #4285F4, #9B72CB, #D96570)';
export const GEMINI_GRADIENT_VERTICAL = 'linear-gradient(180deg, #4285F4, #9B72CB, #D96570)';

export const TYPOGRAPHY = {
  fontFamily: 'Inter, Roboto, system-ui, sans-serif',
  headerWeight: 700,
  bodyWeight: 400,
};

/** 1px 極細線（The Line） */
export const LINE_WIDTH = 1;

/** Snappy start, smooth finish — easing */
export const EASING_SNAPPY = { damping: 200 };
export const EASING_SMOOTH = { damping: 30 };

/** 常用 Easing 預設 */
export const EASING_OUT_EASE = Easing.out(Easing.ease);
export const EASING_SMOOTH_BEZIER = Easing.bezier(0.2, 0.8, 0.2, 1);
export const EASING_MATERIAL = Easing.bezier(0.4, 0, 0.2, 1);
export const EASING_BACK_OUT = Easing.out(Easing.back(1.5));
