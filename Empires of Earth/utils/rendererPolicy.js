import { MAP_SIZES } from '../data/constants.js';

export const CANVAS_AUTO_HEX_THRESHOLD = MAP_SIZES.medium.cols * MAP_SIZES.medium.rows;

export const resolveActiveRenderer = (rendererMode, hexCount, threshold = CANVAS_AUTO_HEX_THRESHOLD) => {
  if (rendererMode !== "auto") return rendererMode;
  return hexCount >= threshold ? "canvas" : "svg";
};

export const resolvePerformanceMode = (performanceModeTouched, performanceMode, hexCount, threshold = CANVAS_AUTO_HEX_THRESHOLD) => (
  performanceModeTouched ? performanceMode : hexCount >= threshold
);
