import React, { useMemo } from 'react';
import { V } from '../../utils/design-system.js';

function VicoinIcon({ size = 14, className = '' }) {
  const uid = useMemo(() => 'vc-' + Math.random().toString(36).slice(2, 7), []);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={V.gold} />
          <stop offset="100%" stopColor="#FFD268" />
        </linearGradient>
      </defs>
      <path d="M12 1.5 L21 6.5 V17.5 L12 22.5 L3 17.5 V6.5 Z" fill={`url(#${uid})`} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
      <path d="M8 8.5 C 8 13, 13 15, 12 18.5 C 11 15, 16 13, 16 8.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default VicoinIcon;
