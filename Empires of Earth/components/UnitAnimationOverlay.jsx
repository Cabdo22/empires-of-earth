import React, { forwardRef } from 'react';
import { UnitIcon } from './Icons.jsx';

const UnitAnimationOverlay = forwardRef(function UnitAnimationOverlay({ unitType, playerColors, visible }, ref) {
  if (!visible) return null;
  const { pBg, pCol, pLight } = playerColors;
  return (
    <g ref={ref} style={{ pointerEvents: 'none' }}>
      <g transform="translate(0,-6)">
        <circle cx={0} cy={0} r={18} fill={pBg} stroke={pCol} strokeWidth="1.5"/>
        <UnitIcon unitType={unitType} x={0} y={0} fg={pLight || "#fff"} sz={15}/>
      </g>
    </g>
  );
});

export default UnitAnimationOverlay;
