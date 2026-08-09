import React, { useState, useEffect, useRef } from 'react';
import { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from '../utils/design-system.js';
import { Palette, Zap, Sparkle, Camera, Music, TrendingUp, Heart, BookOpen, BarChart3, Target } from 'lucide-react';

function DiscoverScreen({ ui, posts }) {
  const categories = [
    { label: 'Design', icon: Palette, color: '#FF3B7A', description: 'UI, UX, graphic design, and visual craft' },
    { label: 'Technology', icon: Zap, color: V.royal, description: 'Code, startups, hardware, and the future' },
    { label: 'Writing', icon: Sparkle, color: V.gold, description: 'Essays, poetry, storytelling, and journalism' },
    { label: 'Photography', icon: Camera, color: '#22C55E', description: 'Landscape, portrait, street, and fine art' },
    { label: 'Music', icon: Music, color: V.electric, description: 'Production, performance, composition, and sound' },
    { label: 'Business', icon: TrendingUp, color: V.orange, description: 'Entrepreneurship, strategy, and growth' },
    { label: 'Education', icon: BookOpen, color: V.teal, description: 'Teaching, learning, research, and discovery' },
    { label: 'Health', icon: Heart, color: V.red, description: 'Wellness, fitness, nutrition, and mental health' },
    { label: 'AI', icon: BarChart3, color: '#8B5CF6', description: 'Machine learning, research, tools, and ethics' },
  ];

  return (
    <section className="px-4 pt-3 pb-8">
      <div className="relative rounded-3xl p-5 overflow-hidden mb-5" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
        <div className="absolute inset-0 pointer-events-none opacity-60" style={softGradientStyle(100, 0.08)} />
        <div className="relative flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ ...gradientStyle(140), boxShadow: `0 4px 14px -4px ${V.royal}60` }}>
            <Target size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: ui.textPrimary }}>Discover creators by what they make</h3>
            <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: ui.textSecondary }}>Browse categories to find work you love. Quality and craft determine what surfaces here.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <button key={i} className="rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-[1px]" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5" style={{ background: `${cat.color}18` }}>
                <Icon size={17} style={{ color: cat.color }} />
              </div>
              <div className="text-[14px] font-semibold" style={{ color: ui.textPrimary }}>{cat.label}</div>
              <div className="text-[11.5px] mt-0.5 leading-snug" style={{ color: ui.textSecondary }}>{cat.description}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* =====================================================================
   SEARCH SCREEN
   ===================================================================== */

export default DiscoverScreen;
