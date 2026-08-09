import React, { useMemo } from 'react';
import { V } from '../../utils/design-system.js';

function VioMark({ size = 40, color = 'currentColor', gradientId = 'vioGrad', useGradient = false, glow = false, glowIntensity = 0.55 }) {
  const uid = useMemo(() => gradientId + '-' + Math.random().toString(36).slice(2, 7), [gradientId]);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      {useGradient && (
        <defs>
          <linearGradient id={uid} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={V.royal} />
            <stop offset="50%" stopColor={V.electric} />
            <stop offset="100%" stopColor={V.gold} />
          </linearGradient>
          {glow && (
            <filter id={`${uid}-outer`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation={size * 0.09} result="b" />
              <feComponentTransfer in="b">
                <feFuncA type="linear" slope={glowIntensity} />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
          {glow && (
            <filter id={`${uid}-inner`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={size * 0.04} result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
      )}
      <g filter={glow ? `url(#${uid}-outer)` : undefined}>
        <g filter={glow ? `url(#${uid}-inner)` : undefined}>
          <path
            d="M16 16 C 16 32, 34 40, 32 52 C 30 40, 48 32, 48 16"
            stroke={useGradient ? `url(#${uid})` : color}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="17" r="2.8" fill={useGradient ? `url(#${uid})` : color} />
        </g>
      </g>
    </svg>
  );
}

export default VioMark;
