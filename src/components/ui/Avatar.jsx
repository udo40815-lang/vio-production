import React from 'react';
import { gradientStyle } from '../../utils/design-system.js';

export default function Avatar({ handle, name, size = 40, ring = false, src }) {
  const initials = ((name || handle || 'V').match(/[A-Za-z0-9]/g) || ['V']).slice(0, 2).join('').toUpperCase();
  return (
    <div className="relative shrink-0">
      {ring && <div className="absolute -inset-[3px] rounded-full opacity-90" style={gradientStyle(140)} />}
      <div className="relative rounded-full flex items-center justify-center font-semibold text-white overflow-hidden" style={{ width: size, height: size, fontSize: size * 0.36, letterSpacing: '-0.02em' }}>
        {src ? <img src={src} alt={name || 'avatar'} className="w-full h-full object-cover" /> : <><div className="absolute inset-0" style={gradientStyle(135)} /><div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.25), transparent 60%)' }} /><span className="relative">{initials}</span></>}
      </div>
    </div>
  );
}
