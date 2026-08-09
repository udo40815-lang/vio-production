import React, { useState } from 'react';
import { Sun, Moon, Menu } from 'lucide-react';
import { V, fmt } from '../../utils/design-system.js';
import VicoinIcon from '../ui/VicoinIcon.jsx';

function TopRail({ ui, setDark, tab, onMenu, onSignOut, setTab }) {
  const titles = { home: 'Home', discover: 'Discover', search: 'Search', create: 'Create', profile: 'Profile', wallet: 'Wallet', notifications: 'Notifications', settings: 'Settings', legal: 'Legal' };
  const [menu, setMenu] = useState(false);
  return (
    <div className="sticky top-0 z-40" style={{ background: ui.dark ? 'rgba(11,16,32,0.68)' : 'rgba(248,250,252,0.68)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderBottom: `1px solid ${ui.border}`, boxShadow: ui.dark ? '0 1px 0 rgba(255,255,255,0.04)' : '0 1px 0 rgba(0,0,0,0.04)' }}>
      <div className="max-w-[600px] mx-auto w-full flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2.5">
          <button onClick={onMenu} className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95" style={{ background: ui.surface, border: `1px solid ${ui.border}` }} aria-label="Menu">
            <Menu size={15} style={{ color: ui.textPrimary }} />
          </button>
          <div className="leading-none">
            <div className="text-[15px] font-semibold tracking-[-0.02em]" style={{ color: ui.textPrimary }}>{titles[tab] || 'Vio'}</div>
            <div className="text-[10px] tracking-[0.14em] uppercase mt-0.5 font-medium" style={{ color: ui.textMuted }}>Vio</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('wallet')} className="flex items-center gap-1.5 h-8 px-2.5 rounded-full transition-all duration-200 hover:brightness-110 cursor-pointer" style={{ background: ui.dark ? 'rgba(245,166,35,0.08)' : 'rgba(245,166,35,0.10)', border: `1px solid ${V.gold}2A` }}>
            <VicoinIcon size={13} />
            <span className="text-[12px] font-semibold" style={{ color: ui.dark ? '#FBBF24' : '#92400E' }}>{fmt(ui.balance)}</span>
          </button>
          <button onClick={() => setDark(!ui.dark)} className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95" style={{ background: ui.surface, border: `1px solid ${ui.border}` }}>
            {ui.dark ? <Sun size={13} style={{ color: V.gold }} /> : <Moon size={13} style={{ color: V.royal }} />}
          </button>
        </div>
      </div>
    </div>
  );
}


export default TopRail;
