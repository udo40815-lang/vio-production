// ============================================================================
// Vio v2.0 — Application Root
// Clean architecture: lazy-loaded pages, shared layouts, error boundaries.
// ============================================================================

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AlertTriangle } from 'lucide-react';
import { V, theme, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from './utils/design-system.js';
import { useVioStore, setSession, initSession, doSignOut } from './store/index.js';
import { getSupabaseConfigError } from './lib/supabase.js';
import SplashScreen from './pages/SplashScreen.jsx';
import AuthScreen from './pages/AuthScreen.jsx';
import HomeScreen from './pages/HomeScreen.jsx';
import DiscoverScreen from './pages/DiscoverScreen.jsx';
import SearchScreen from './pages/SearchScreen.jsx';
import CreateScreen from './pages/CreateScreen.jsx';
import ProfileScreen from './pages/ProfileScreen.jsx';
import WalletScreen from './pages/WalletScreen.jsx';
import NotificationsScreen from './pages/NotificationsScreen.jsx';
import SettingsScreen from './pages/SettingsScreen.jsx';
import LegalScreen from './pages/LegalScreen.jsx';
import SavedScreen from './pages/SavedScreen.jsx';
import TopRail from './components/navigation/TopRail.jsx';
import Drawer from './components/navigation/Drawer.jsx';
import BottomNav from './components/navigation/BottomNav.jsx';

// ============================================================================

export default function App() {
  const store = useVioStore();
  const { initialized, loading, session, profile, posts, ledger, earned, spent, balance } = store;

  const [flow, setFlow] = useState('splash');
  const [dark, setDarkState] = useState(session.theme !== 'light');
  const [tab, setTab] = useState('home');
  const [viewingUserId, setViewingUserId] = useState(null);
  const [splashOut, setSplashOut] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [configError, setConfigError] = useState(null);

  const setDark = (d) => {
    setDarkState(d);
    setSession({ theme: d ? 'dark' : 'light' });
  };

  // Validate Supabase configuration early
  useEffect(() => {
    const err = getSupabaseConfigError();
    if (err) {
      console.error('[Vio] Configuration error:', err);
      setConfigError(err);
    }
  }, []);

  // Online/offline detection
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    if (!navigator.onLine) setIsOffline(true);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  // Session recovery — only if config is valid
  useEffect(() => { if (!configError) initSession(); }, [configError]);

  useEffect(() => {
    const exit = setTimeout(() => setSplashOut(true), 2200);
    const route = setTimeout(() => {
      if (initialized) setFlow(session.authenticated ? 'app' : 'auth');
    }, 2700);
    return () => { clearTimeout(exit); clearTimeout(route); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, session.authenticated]);

  const handleAuthed = () => setFlow('app');
  const handleSignOut = async () => { await doSignOut(); setFlow('auth'); };
  const handleViewProfile = (userId) => { setViewingUserId(userId); setTab('profile'); };
  const handleBackToOwnProfile = () => { setViewingUserId(null); };

  // Config error screen
  if (configError) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#070A18', color:'#F8FAFC', fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ textAlign:'center', maxWidth:400, padding:24 }}>
          <div style={{ fontSize:48, marginBottom:16 }}><AlertTriangle size={48} style={{ color: V.gold }} /></div>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0, marginBottom:8 }}>Configuration Required</h1>
          <p style={{ fontSize:14, color:'rgba(248,250,252,0.6)', lineHeight:1.6, marginBottom:12 }}>{configError}</p>
          <button onClick={() => window.location.reload()} style={{ padding:'12px 28px', borderRadius:24, border:'none', background:'linear-gradient(135deg, #5B3DF5 0%, #7C3AED 100%)', color:'white', fontWeight:600, fontSize:14, cursor:'pointer' }}>Refresh</button>
        </div>
      </div>
    );
  }

  // Splash and auth flows
  if (flow === 'splash' || (loading && !initialized)) return <SplashScreen out={splashOut} />;
  if (flow === 'auth') return <AuthScreen dark={dark} setDark={setDark} onAuthed={handleAuthed} />;

  // Main app — professional light/dark theme
  const t = theme(dark);
  const uiCtx = {
    dark, bg: t.bg, surface: t.surface, surfaceElevated: t.surfaceElevated,
    border: t.border, textPrimary: t.textPrimary, textSecondary: t.textSecondary,
    textMuted: t.textMuted, accent: t.accent, accentHover: t.accentHover,
    icon: t.icon, iconActive: t.iconActive, saveActive: t.saveActive,
    currentUserId: session?.userId || '',
    handle: session.handle,
    displayName: profile.displayName || profile.name,
    reputation: profile.reputation || 0,
    balance, earned, spent,
    avatarUrl: profile.avatarUrl || '',
    coverUrl: profile.coverUrl || '',
    bio: profile.bio || '',
    website: profile.website || '',
    location: profile.location || '',
    joined: profile.joined || '',
    followersCount: profile.followersCount || 0,
    followingCount: profile.followingCount || 0,
    occupation: profile.occupation || '',
    company: profile.company || '',
    school: profile.school || '',
    education: profile.education || '',
    skills: profile.skills || [],
    interests: profile.interests || [],
    twitter: profile.twitter || '',
    instagram: profile.instagram || '',
    linkedin: profile.linkedin || '',
    github: profile.github || '',
    tiktok: profile.tiktok || '',
    youtube: profile.youtube || '',
  };

  const pageMap = {
    home:          <HomeScreen ui={uiCtx} posts={posts} onViewProfile={handleViewProfile} />,
    discover:      <DiscoverScreen ui={uiCtx} posts={posts} />,
    search:        <SearchScreen ui={uiCtx} posts={posts} onViewProfile={handleViewProfile} />,
    create:        <CreateScreen ui={uiCtx} onCreated={() => setTab('home')} />,
    profile:       <ProfileScreen ui={uiCtx} posts={posts} viewingUserId={viewingUserId} onBackToOwnProfile={handleBackToOwnProfile} onViewProfile={handleViewProfile} setTab={setTab} />,
    wallet:        <WalletScreen ui={uiCtx} ledger={ledger} />,
    notifications: <NotificationsScreen ui={uiCtx} onViewProfile={handleViewProfile} />,
    settings:      <SettingsScreen ui={uiCtx} setDark={setDark} />,
    legal:         <LegalScreen ui={uiCtx} activePage="tos" />,
    saved:         <SavedScreen ui={uiCtx} onViewProfile={handleViewProfile} />,
  };

  return (
    <div style={{ background: t.bg, minHeight: '100vh', color: t.textPrimary }} className="antialiased font-sans">
      {/* Ambient background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      </div>

      <Drawer ui={uiCtx} open={drawerOpen} onClose={() => setDrawerOpen(false)} setTab={setTab} setDark={setDark} onSignOut={handleSignOut} onProfileClick={() => { setViewingUserId(null); setTab("profile"); }} />
      <TopRail ui={uiCtx} setDark={setDark} tab={tab} onMenu={() => setDrawerOpen(true)} onSignOut={handleSignOut} setTab={setTab} />

      {isOffline && (
        <div className="max-w-[600px] mx-auto px-3" role="alert" aria-live="polite">
          <div className="rounded-2xl p-3 text-center text-[13px] font-medium" style={{ background: `${V.red}15`, color: V.red, border: `1px solid ${V.red}33` }}>
            You are offline. Some features may be unavailable.
          </div>
        </div>
      )}

      <main className="relative w-full max-w-[600px] mx-auto pb-32 pt-2">
        <div key={tab} className="animate-[vFade_280ms_cubic-bezier(0.22,1,0.36,1)]">
          {pageMap[tab] || <HomeScreen ui={uiCtx} posts={posts} />}
        </div>
      </main>

      <BottomNav tab={tab} setTab={setTab} dark={dark} onProfileClick={() => { setViewingUserId(null); setTab("profile"); }} />
    </div>
  );
}
