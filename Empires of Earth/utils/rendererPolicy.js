import { MAP_SIZES } from '../data/constants.js';

export const CANVAS_AUTO_HEX_THRESHOLD = MAP_SIZES.medium.cols * MAP_SIZES.medium.rows;
export const LARGE_MAP_HEX_THRESHOLD = MAP_SIZES.large.cols * MAP_SIZES.large.rows;

export const resolveActiveRenderer = (rendererMode, hexCount, threshold = CANVAS_AUTO_HEX_THRESHOLD) => {
  if (rendererMode !== "auto") return rendererMode;
  return hexCount >= threshold ? "canvas" : "svg";
};

export const resolvePerformanceMode = (performanceModeTouched, performanceMode, hexCount, threshold = CANVAS_AUTO_HEX_THRESHOLD) => (
  performanceModeTouched ? performanceMode : hexCount >= threshold
);

export const getZoomBucket = (zoom) => {
  if (zoom < 0.75) return "far";
  if (zoom < 1.2) return "mid";
  return "near";
};

export const resolveVisualDetailLevel = ({
  reducedEffects,
  hexCount,
  zoom,
  mediumThreshold = CANVAS_AUTO_HEX_THRESHOLD,
  largeThreshold = LARGE_MAP_HEX_THRESHOLD,
}) => {
  if (reducedEffects) return 0;
  const zoomBucket = getZoomBucket(zoom);
  if (hexCount >= largeThreshold || zoomBucket === "far") return 1;
  if (hexCount >= mediumThreshold || zoomBucket === "mid") return 2;
  return 3;
};
