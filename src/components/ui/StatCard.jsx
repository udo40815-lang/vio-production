import React from 'react';
import { V } from '../../utils/design-system.js';

function StatCard({ ui, icon: Icon, color, label, value, raw }) {
  return (
    <div className="rounded-2xl p-3.5 text-center transition-all duration-300 hover:-translate-y-[1px]" style={{ background: ui.dark ? V.surfaceDark : '#FAFAF8', border: `1px solid ${ui.border}` }}>
      <div className="inline-flex items-center justify-center gap-1">
        {raw ? <Icon size={12} /> : <Icon size={12} style={{ color, flexShrink: 0 }} />}
        <span className="text-[9px] font-medium tracking-[0.08em] uppercase truncate" style={{ color: ui.textMuted }}>{label}</span>
      </div>
      <div className="text-[20px] font-semibold mt-1 tracking-[-0.02em] leading-none" style={{ color: ui.textPrimary }}>{value}</div>
    </div>
  );
}


export default StatCard;
