// Vio Design System — Professional light/dark theme tokens

/* =====================================================================
   VIO BRAND TOKENS
   ===================================================================== */

const V = {
  // Brand — purple accent
  royal:     '#7C3AED',
  royalDeep: '#6D28D9',
  electric:  '#8B5CF6',
  electricLight: '#A78BFA',

  // Legacy utility (keep for backward compat where explicitly used)
  gold:      '#F5A623',
  goldWarm:  '#FFB84D',

  // Dark-mode background palette
  dark:      '#09090B',
  darker:    '#070708',
  darkest:   '#050506',

  // Light-mode background palette
  light:     '#F8F8FA',
  lightWarm: '#F4F4F6',

  // Legacy dark ink
  ink:       '#111113',

  // Surface tokens (dark)
  surfaceDark:        '#141416',
  surfaceDarkHover:   '#1A1A1C',
  surfaceDarkElevated:'#18181B',

  // Semantic colors
  red:       '#EF4444',
  green:     '#22C55E',
  teal:      '#4ECDC4',
  coral:     '#FF6B6B',
  orange:    '#F97316',
};

/* =====================================================================
   THEME FUNCTION — returns semantic ui context object
   ===================================================================== */

export function theme(dark) {
  if (dark) {
    return {
      dark: true,
      bg:              '#09090B',
      surface:         '#141416',
      surfaceElevated: '#18181B',
      border:          '#27272A',
      textPrimary:     '#FAFAFA',
      textSecondary:   '#A1A1AA',
      textMuted:       '#71717A',
      accent:          V.royal,
      accentHover:     V.electric,
      icon:            '#A1A1AA',
      iconActive:      V.royal,
      saveActive:      '#FFFFFF',
    };
  }
  return {
    dark: false,
    bg:              '#F8F8FA',
    surface:         '#FFFFFF',
    surfaceElevated: '#FAFAFA',
    border:          '#E7E7EB',
    textPrimary:     '#111113',
    textSecondary:   '#6B6B73',
    textMuted:       '#8E8E96',
    accent:          V.royal,
    accentHover:     V.electric,
    icon:            '#8E8E96',
    iconActive:      V.royal,
    saveActive:      V.royal,
  };
}

/* =====================================================================
   HELPERS
   ===================================================================== */

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
  backgroundImage: `linear-gradient(${deg}deg, ${V.royal} 0%, ${V.electric} 100%)`,
});

const softGradientStyle = (deg = 135, a = 0.14) => ({
  backgroundImage: `linear-gradient(${deg}deg, ${V.royal}${Math.round(a*255).toString(16).padStart(2,'0')}, ${V.electric}${Math.round(a*255).toString(16).padStart(2,'0')})`,
});

export { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle };
