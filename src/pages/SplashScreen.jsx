import React, { useState, useEffect, useRef } from 'react';
import { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from '../utils/design-system.js';
import VioMark from '../components/ui/VioMark.jsx';

function SplashScreen({ out }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{
        background: '#040810',
        transition: 'opacity 500ms cubic-bezier(0.22,1,0.36,1), filter 500ms cubic-bezier(0.22,1,0.36,1)',
        ...(out ? { opacity: 0, filter: 'blur(16px)' } : {}),
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(1400px 900px at 15% 15%, rgba(91,61,245,0.38), transparent 50%), radial-gradient(1100px 800px at 85% 80%, rgba(245,166,35,0.25), transparent 55%), radial-gradient(1000px 700px at 55% 30%, rgba(124,58,237,0.30), transparent 60%), radial-gradient(800px 500px at 50% 50%, rgba(157,111,255,0.12), transparent 70%), linear-gradient(180deg, #040810, ${V.dark})`,
          backgroundSize: '200% 200%',
          animation: 'vGradientShift 10s ease-in-out infinite',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(600px 400px at 50% 50%, rgba(255,255,255,0.10), transparent 70%)',
          animation: 'vPulse 4.5s ease-in-out infinite',
        }}
      />
      <div className="relative flex flex-col items-center" style={{ animation: 'vBreath 4.2s ease-in-out infinite' }}>
        <div style={{ animation: 'vGlow 4.2s ease-in-out infinite' }}>
          <VioMark size={120} useGradient gradientId="splashGrad" glow glowIntensity={0.60} />
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   AUTH SCREEN
   ===================================================================== */

export default SplashScreen;
