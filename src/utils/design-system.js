// Vio Design System — Colors, helpers, gradients

/* =====================================================================
   DESIGN SYSTEM TOKENS & HELPERS
   ===================================================================== */

const V = {
  royal:     '#5B3DF5',
  royalDeep: '#4C2EE0',
  electric:  '#7C3AED',
  electricLight: '#9D6FFF',
  gold:      '#F5A623',
  goldWarm:  '#FFB84D',
  dark:      '#0B1020',
  darker:    '#070A18',
  darkest:   '#040810',
  light:     '#F8FAFC',
  lightWarm: '#F1F5F9',
  ink:       '#0F1226',
  surfaceDark: 'rgba(255,255,255,0.03)',
  surfaceDarkHover: 'rgba(255,255,255,0.05)',
  red:       '#FF3B7A',
  green:     '#22C55E',
  teal:      '#4ECDC4',
  coral:     '#FF6B6B',
  orange:    '#F97316',
};
const safe = (v) => String(v ?? '').trim();

const fmt = (n) => {
  const x = Number(n) || 0;
  if (x >= 1_000_000) return (x / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (x >= 1_000) return (x / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(x);
};
const timeAgo = (iso) => {
  if (!iso) return 'just now';
  const d = new Date(iso);
  if (isNaN(d)) return 'just now';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString();
};
const gradientStyle = (deg = 135) => ({
  backgroundImage: `linear-gradient(${deg}deg, ${V.royal} 0%, ${V.electric} 50%, ${V.gold} 100%)`,
});
const softGradientStyle = (deg = 135, a = 0.14) => ({
  backgroundImage: `linear-gradient(${deg}deg, ${V.royal}${Math.round(a*255).toString(16).padStart(2,'0')}, ${V.electric}${Math.round(a*255).toString(16).padStart(2,'0')} 55%, ${V.gold}${Math.round(a*255).toString(16).padStart(2,'0')})`,
});
export { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle };
