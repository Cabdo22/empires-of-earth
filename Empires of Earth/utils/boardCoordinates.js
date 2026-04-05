import { HEX_SIZE, SQRT3, getMapDimensions, hexAt } from '../data/constants.js';

export const isPointInHex = (worldX, worldY, hex) => {
  const localX = Math.abs(worldX - hex.x);
  const localY = Math.abs(worldY - hex.y);
  const halfHeight = (SQRT3 * HEX_SIZE) / 2;
  return localX <= HEX_SIZE && localY <= halfHeight && (SQRT3 * localX) + localY <= SQRT3 * HEX_SIZE;
};

export const getViewportMetrics = ({
  containerRect,
  viewportWidth,
  viewportHeight,
  viewportLeft,
  viewportTop,
} = {}) => ({
  width: containerRect?.width ?? viewportWidth ?? window.innerWidth,
  height: containerRect?.height ?? viewportHeight ?? window.innerHeight,
  left: containerRect?.left ?? viewportLeft ?? 0,
  top: containerRect?.top ?? viewportTop ?? 0,
});

export const getWorldTransform = ({
  containerRect,
  viewportWidth,
  viewportHeight,
  viewportLeft,
  viewportTop,
  pan,
  zoom,
  worldWidth,
  worldHeight,
}) => {
  const metrics = getViewportMetrics({ containerRect, viewportWidth, viewportHeight, viewportLeft, viewportTop });
  return {
    ...metrics,
    centerX: metrics.width / 2,
    centerY: metrics.height / 2,
    translateX: pan.x + metrics.width / 2 - (worldWidth * zoom) / 2,
    translateY: pan.y + metrics.height / 2 - (worldHeight * zoom) / 2,
  };
};

export const clientPointToWorldPoint = ({
  clientX,
  clientY,
  containerRect,
  pan,
  zoom,
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  viewportLeft,
  viewportTop,
}) => {
  const transform = getWorldTransform({
    containerRect,
    viewportWidth,
    viewportHeight,
    viewportLeft,
    viewportTop,
    pan,
    zoom,
    worldWidth,
    worldHeight,
  });
  const localX = clientX - transform.left;
  const localY = clientY - transform.top;

  return {
    worldX: (localX - transform.translateX) / zoom,
    worldY: (localY - transform.translateY) / zoom,
  };
};

export const worldPointToClientPoint = ({
  worldX,
  worldY,
  containerRect,
  pan,
  zoom,
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  viewportLeft,
  viewportTop,
}) => {
  const transform = getWorldTransform({
    containerRect,
    viewportWidth,
    viewportHeight,
    viewportLeft,
    viewportTop,
    pan,
    zoom,
    worldWidth,
    worldHeight,
  });
  return {
    clientX: transform.left + transform.translateX + worldX * zoom,
    clientY: transform.top + transform.translateY + worldY * zoom,
  };
};

export const getPanForWorldPointAtClientPoint = ({
  worldX,
  worldY,
  clientX,
  clientY,
  containerRect,
  zoom,
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  viewportLeft,
  viewportTop,
}) => {
  const metrics = getViewportMetrics({ containerRect, viewportWidth, viewportHeight, viewportLeft, viewportTop });
  const localX = clientX - metrics.left;
  const localY = clientY - metrics.top;
  return {
    x: localX - metrics.width / 2 + (worldWidth * zoom) / 2 - worldX * zoom,
    y: localY - metrics.height / 2 + (worldHeight * zoom) / 2 - worldY * zoom,
  };
};

export const getViewportWorldBounds = ({
  containerRect,
  pan,
  zoom,
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  viewportLeft,
  viewportTop,
}) => {
  const transform = getWorldTransform({
    containerRect,
    viewportWidth,
    viewportHeight,
    viewportLeft,
    viewportTop,
    pan,
    zoom,
    worldWidth,
    worldHeight,
  });
  return {
    left: -transform.translateX / zoom,
    top: -transform.translateY / zoom,
    width: transform.width / zoom,
    height: transform.height / zoom,
  };
};

export const findHexFromWorldPoint = ({ worldX, worldY, hexes }) => {
  const { cols, rows } = getMapDimensions(hexes);
  const approxCol = Math.round((worldX - HEX_SIZE - 50) / (1.5 * HEX_SIZE));

  for (let col = approxCol - 1; col <= approxCol + 1; col++) {
    if (col < 0 || col >= cols) continue;
    const baseRow = (worldY - HEX_SIZE - 50 - (col % 2 === 1 ? (SQRT3 * HEX_SIZE) / 2 : 0)) / (SQRT3 * HEX_SIZE);
    const approxRow = Math.round(baseRow);
    for (let row = approxRow - 1; row <= approxRow + 1; row++) {
      if (row < 0 || row >= rows) continue;
      const hex = hexAt(hexes, col, row);
      if (!hex) continue;
      if (isPointInHex(worldX, worldY, hex)) {
        return { id: hex.id, col: hex.col, row: hex.row, hex, uk: hex.uk };
      }
    }
  }

  return null;
};
