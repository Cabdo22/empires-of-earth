import { HEX_SIZE, SQRT3, getMapDimensions, hexAt } from '../data/constants.js';

export const isPointInHex = (worldX, worldY, hex) => {
  const localX = Math.abs(worldX - hex.x);
  const localY = Math.abs(worldY - hex.y);
  const halfHeight = (SQRT3 * HEX_SIZE) / 2;
  return localX <= HEX_SIZE && localY <= halfHeight && (SQRT3 * localX) + localY <= SQRT3 * HEX_SIZE;
};

export const clientPointToWorldPoint = ({
  clientX,
  clientY,
  containerRect,
  pan,
  zoom,
  worldWidth,
  worldHeight,
}) => {
  const viewportWidth = containerRect?.width || window.innerWidth;
  const viewportHeight = containerRect?.height || window.innerHeight;
  const viewportLeft = containerRect?.left || 0;
  const viewportTop = containerRect?.top || 0;
  const cx = viewportWidth / 2;
  const cy = viewportHeight / 2;
  const localX = clientX - viewportLeft;
  const localY = clientY - viewportTop;

  return {
    worldX: (localX - (pan.x + cx - (worldWidth * zoom) / 2)) / zoom,
    worldY: (localY - (pan.y + cy - (worldHeight * zoom) / 2)) / zoom,
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
