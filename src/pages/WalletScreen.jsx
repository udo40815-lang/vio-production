import React, { useState, useEffect, useRef } from 'react';
import { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from '../utils/design-system.js';
import { Sparkles, Heart, Award, ArrowUpRight, ArrowDownLeft, Clock, Coins, Eye, Check, Rocket, Sparkle, Loader2 } from 'lucide-react';
import VicoinIcon from '../components/ui/VicoinIcon.jsx';
import Ring from '../components/ui/Ring.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useVioStore, doLoadTransactionHistory, doRefreshBalance, doGetVisibilityBreakdown, doLoadMyBoosts } from '../store/index.js';

function WalletScreen({ ui, ledger }) {
  const hasActivity = ledger.length > 0;
  const earnWays = [
    { icon: Sparkles, color: V.royal, title: 'Post quality content', body: 'Earn Vicoins on every published post. Craft and resonance earn more.' },
    { icon: Heart, color: V.red, title: 'Meaningful engagement', body: 'Comments and shares from trusted creators earn more than likes.' },
    { icon: Award, color: V.gold, title: 'Help other creators', body: 'Give thoughtful feedback in threads to earn reputation and coins.' },
  ];

  return (
    <section className="px-5 pt-5 pb-8 space-y-5">
      {/* Balance card */}
      <div className="rounded-3xl overflow-hidden relative text-white" style={{ ...gradientStyle(135), boxShadow: '0 24px 60px -20px rgba(91,61,245,0.45)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(800px 400px at 20% 20%, rgba(255,255,255,0.26), transparent 60%)' }} />
          <div className="absolute top-0 -left-full w-full h-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', animation: 'vBalanceShimmer 3s ease-in-out infinite' }} />
        </div>
        <div className="relative p-6">
          <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] uppercase text-white/78"><VicoinIcon size={13} /> Vicoins Wallet</div>
          <div className="mt-3 flex items-baseline gap-2"><span className="text-[52px] font-semibold tracking-[-0.03em] leading-none">{fmt(ui.balance)}</span><span className="text-white/65 text-[15px]">Vicoins</span></div>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.13)' }}><div className="text-[10px] tracking-[0.14em] uppercase text-white/75">Earned</div><div className="text-[18px] font-semibold mt-0.5 inline-flex items-center gap-1.5"><ArrowDownLeft size={14} /><span>{fmt(ui.earned)}</span></div></div>
            <div className="flex-1 rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.13)' }}><div className="text-[10px] tracking-[0.14em] uppercase text-white/75">Spent</div><div className="text-[18px] font-semibold mt-0.5 inline-flex items-center gap-1.5"><ArrowUpRight size={14} /><span>{fmt(ui.spent)}</span></div></div>
          </div>
          {!hasActivity && (
            <div className="mt-5 rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <div className="text-[13px] font-semibold">Ready to earn?</div>
              <div className="text-[12px] mt-1 text-white/75">Publish your first post and start building your Vicoin balance.</div>
            </div>
          )}
        </div>
      </div>

      {/* Earn / Spend / Rewards / Boosts tabs */}
      <div className="flex gap-1.5">
        {['Activity', 'Rewards', 'Boosts'].map(t => (
          <button key={t} className="flex-1 h-10 rounded-full text-[12.5px] font-semibold transition-all duration-200" style={{ background: t === 'Activity' ? (ui.dark ? 'rgba(124,58,237,0.14)' : 'rgba(124,58,237,0.08)') : 'transparent', color: t === 'Activity' ? (ui.dark ? '#DDD6FE' : V.royal) : ui.textMuted, border: t === 'Activity' ? `1px solid ${V.electric}44` : `1px solid transparent` }}>
            {t}
          </button>
        ))}
      </div>

      {/* Activity */}
      {!hasActivity ? (
        <div className="rounded-3xl p-10 text-center relative overflow-hidden" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
          <div className="absolute inset-0 pointer-events-none opacity-60" style={softGradientStyle(140, 0.06)} />
          <div className="relative mx-auto w-16 h-16 rounded-3xl flex items-center justify-center" style={{ ...gradientStyle(140), boxShadow: `0 8px 24px -8px ${V.royal}50`, animation: 'vFloat 5s ease-in-out infinite' }}><VicoinIcon size={26} /></div>
          <div className="relative mt-5 text-[18px] font-semibold tracking-[-0.02em]" style={{ color: ui.textPrimary }}>Your wallet is ready</div>
          <div className="relative mt-2 text-[14px] leading-relaxed max-w-xs mx-auto" style={{ color: ui.textSecondary }}>Publish your first post to earn Vicoins. Spend them to boost visibility, unlock tools, and join premium campaigns.</div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
          {ledger.map((e, i) => (
            <div key={e.id || i} className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-black/[0.02]" style={{ borderTop: i === 0 ? 'none' : `1px solid ${ui.border}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: e.kind === 'earn' ? `${V.gold}20` : `${V.electric}20` }}>{e.kind === 'earn' ? <ArrowDownLeft size={14} style={{ color: V.gold }} /> : <ArrowUpRight size={14} style={{ color: V.electric }} />}</div>
              <div className="flex-1 min-w-0"><div className="text-[13.5px] font-semibold truncate" style={{ color: ui.textPrimary }}>{safe(e.reason) || safe(e.source)}</div><div className="text-[12px] mt-0.5" style={{ color: ui.textMuted }}>{timeAgo(e.created_at)}</div></div>
              <div className="text-[14px] font-semibold" style={{ color: e.kind === 'earn' ? V.green : ui.textPrimary }}>{e.kind === 'earn' ? '+' : '−'}{fmt(e.amount)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Ways to earn */}
      <div>
        <div className="flex items-center gap-2 mb-3"><Sparkles size={14} style={{ color: V.royal }} /><h3 className="text-[14px] font-semibold" style={{ color: ui.textPrimary }}>Ways to earn</h3></div>
        <div className="grid gap-2.5">
          {earnWays.map((w, i) => {
            const Icon = w.icon;
            return (
              <div key={i} className="rounded-2xl p-4 flex items-start gap-3 transition-all duration-300 hover:-translate-y-[1px]" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${w.color}20` }}><Icon size={16} style={{ color: w.color }} /></div>
                <div className="flex-1"><div className="text-[14px] font-semibold" style={{ color: ui.textPrimary }}>{w.title}</div><div className="text-[13px] mt-0.5 leading-relaxed" style={{ color: ui.textSecondary }}>{w.body}</div></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   NOTIFICATIONS SCREEN
   ===================================================================== */

export default WalletScreen;
