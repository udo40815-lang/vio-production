import React, { useMemo } from 'react';
import { V, gradientStyle } from '../../utils/design-system.js';

const Ring = ({ score = 0, size = 44, stroke = 3.5, dark }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const off = c - (pct / 100) * c;
  const gid = useMemo(() => `ring-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <svg width={size} height={size} className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={V.royal} />
          <stop offset="55%" stopColor={V.electric} />
          <stop offset="100%" stopColor={V.gold} />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} stroke={dark ? 'rgba(255,255,255,0.08)' : 'rgba(11,16,32,0.08)'} strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={`url(#${gid})`} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: size * 0.28, fontWeight: 700, fill: dark ? '#F8FAFC' : V.ink, letterSpacing: '-0.02em' }}>
        {Math.round(pct)}
      </text>
    </svg>
  );
};

const Avatar = ({ handle, name, size = 40, ring = false }) => {
  const initials = ((name || handle || 'V').match(/[A-Za-z0-9]/g) || ['V']).slice(0, 2).join('').toUpperCase();
  return (
    <div className="relative shrink-0">
      {ring && (
        <div className="absolute -inset-[3px] rounded-full opacity-90" style={gradientStyle(140)} />
      )}
      <div
        className="relative rounded-full flex items-center justify-center font-semibold text-white overflow-hidden"
        style={{
          width: size, height: size,
          fontSize: size * 0.36,
          letterSpacing: '-0.02em',
        }}
      >
        <div className="absolute inset-0" style={gradientStyle(135)} />
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.25), transparent 60%)' }} />
        <span className="relative">{initials}</span>
      </div>
    </div>
  );
};

export default Ring;
