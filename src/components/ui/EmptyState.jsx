import React from 'react';
import { V } from '../../utils/design-system.js';

function EmptyState({ ui, icon: Icon, title, body }) {
  return (
    <div className="rounded-3xl p-10 text-center" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
      <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center opacity-60" style={{ background: `${V.royal}15` }}>
        <Icon size={20} style={{ color: ui.textMuted }} />
      </div>
      <div className="mt-4 text-[16px] font-semibold" style={{ color: ui.textPrimary }}>{title}</div>
      <div className="mt-1.5 text-[13px] leading-relaxed max-w-xs mx-auto" style={{ color: ui.textSecondary }}>{body}</div>
    </div>
  );
}


export default EmptyState;
