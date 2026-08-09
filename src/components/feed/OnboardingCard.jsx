import React from 'react';
import { V } from '../../utils/design-system.js';
import { ChevronRight } from 'lucide-react';

function OnboardingCard({ ui, icon: Icon, title, body, color, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl p-4 flex items-start gap-3.5 transition-all duration-300 hover:-translate-y-[1px]" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1">
        <div className="text-[14px] font-semibold" style={{ color: ui.textPrimary }}>{title}</div>
        <div className="text-[12.5px] mt-0.5 leading-relaxed" style={{ color: ui.textSecondary }}>{body}</div>
      </div>
      <ChevronRight size={15} style={{ color: ui.textMuted }} className="mt-1" />
    </button>
  );
}


export default OnboardingCard;
