import React from 'react';
import { Home, Compass, Plus, Search, User } from 'lucide-react';
import { gradientStyle, V } from '../../utils/design-system.js';

function BottomNav({ tab, setTab, dark, onProfileClick }) {
  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'create', label: 'Create', icon: Plus, primary: true },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'profile', label: 'You', icon: User },
  ];

  return (
    <div className="fixed left-0 right-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),6px)]">
      <div className="max-w-[600px] mx-auto w-full px-4">
        <nav className="mx-auto rounded-full h-[64px] px-1 flex items-center justify-around relative overflow-hidden" style={{ background: dark ? 'rgba(13,18,38,0.76)' : 'rgba(255,255,255,0.82)', border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,18,38,0.05)'}`, backdropFilter: 'blur(32px) saturate(200%)', WebkitBackdropFilter: 'blur(32px) saturate(200%)', boxShadow: dark ? '0 24px 64px -20px rgba(0,0,0,0.70)' : '0 24px 64px -30px rgba(15,18,38,0.30)' }}>
          {items.map(it => {
            const Icon = it.icon;
            const active = tab === it.id;
            if (it.primary) {
              return (
                <button key={it.id} id="vio-nav-create" onClick={() => setTab(it.id)} className="relative flex items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-92" style={{ width: 46, height: 46, ...gradientStyle(140), boxShadow: '0 14px 30px -10px rgba(91,61,245,0.50)' }} aria-label={it.label}>
                  <Plus size={18} className="text-white" strokeWidth={2.5} />
                </button>
              );
            }
            return (
              <button key={it.id} onClick={() => { if (it.id === "profile" && onProfileClick) onProfileClick(); else setTab(it.id); }} className="relative flex flex-col items-center justify-center gap-0.5 transition-all duration-300" style={{ color: active ? (dark ? '#DDD6FE' : V.royal) : (dark ? 'rgba(248,250,252,0.50)' : 'rgba(15,18,38,0.45)'), fontWeight: active ? 600 : 400 }} aria-label={it.label}>
                <Icon size={20} strokeWidth={active ? 2.2 : 1.6} style={{ transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1)', transform: active ? 'scale(1.05)' : 'scale(1)' }} />
                <span className="text-[10px] tracking-[0.02em]" style={{ animation: active ? 'vFade 180ms ease-out' : 'none' }}>{it.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* =====================================================================
   MAIN APP — Vio v1.4
   ===================================================================== */

export default BottomNav;
