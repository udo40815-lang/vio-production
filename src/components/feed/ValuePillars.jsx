import React from 'react';
import { Target, Award } from 'lucide-react';
import { V } from '../../utils/design-system.js';
import VicoinIcon from '../ui/VicoinIcon.jsx';

function ValuePillars({ ui }) {
  const pillars = [
    { icon: Target, title: 'Fair discovery', body: 'Value-weighted ranking. Every post gets a fair shot, regardless of who you are.', color: V.royal },
    { icon: Award, title: 'Creator reputation', body: 'Your reputation grows from the quality of your work and how you engage with others.', color: V.gold },
    { icon: VicoinIcon, title: 'Vicoins economy', body: 'Earn by creating. Spend to reach the right audience. A fair creator economy.', color: V.electric, raw: true },
  ];
  return (
    <div className="mt-6 grid grid-cols-1 gap-2.5">
      {pillars.map((p, i) => {
        const Icon = p.icon;
        return (
          <div key={i} className="rounded-2xl p-4 flex items-start gap-3 transition-all duration-300 hover:-translate-y-[1px]" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${p.color}22` }}>{p.raw ? <Icon size={15} /> : <Icon size={15} style={{ color: p.color }} />}</div>
            <div><div className="text-[13.5px] font-semibold" style={{ color: ui.textPrimary }}>{p.title}</div><div className="text-[12.5px] mt-0.5 leading-relaxed" style={{ color: ui.textSecondary }}>{p.body}</div></div>
          </div>
        );
      })}
    </div>
  );
}


export default ValuePillars;
