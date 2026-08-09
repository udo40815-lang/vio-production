import React from 'react';
import { Sparkles } from 'lucide-react';
import { V, softGradientStyle, gradientStyle } from '../../utils/design-system.js';

function MissionCard({ ui, compact }) {
  return (
    <div className={`relative rounded-3xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-[1px] ${compact ? '' : 'mb-5'}`} style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
      <div className="absolute inset-0 opacity-[0.6] pointer-events-none" style={softGradientStyle(120, 0.08)} />
      <div className="relative flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg" style={{ ...gradientStyle(140), boxShadow: `0 4px 14px -4px ${V.royal}60` }}>
          <Sparkles size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-medium tracking-[0.14em] uppercase" style={{ color: ui.textMuted }}>How Vio works</div>
          <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] leading-snug" style={{ color: ui.textPrimary }}>Value gets discovered, not just volume.</h3>
          {!compact && (
            <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: ui.textSecondary }}>
              Every post earns a Visibility Score based on craft and resonance. No follower counts. No algorithms favouring the already famous.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


export default MissionCard;
