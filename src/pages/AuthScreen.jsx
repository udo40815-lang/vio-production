import React, { useState, useEffect, useRef, useMemo } from 'react';
import { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from '../utils/design-system.js';
import { Sun, Moon, ArrowLeft, User } from 'lucide-react';
import { Mail, Lock, AtSign, Loader2 } from 'lucide-react';
import VioMark from '../components/ui/VioMark.jsx';
import { doSignUp, doSignIn, doForgotPassword, addLedgerEntry } from '../store/index.js';

function AuthScreen({ dark, setDark, onAuthed }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const bg = dark ? V.dark : V.light;
  const surface = dark ? V.surfaceDark : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,18,38,0.08)';
  const text = dark ? '#F8FAFC' : V.ink;
  const sub = dark ? 'rgba(248,250,252,0.60)' : 'rgba(15,18,38,0.55)';
  const muted = dark ? 'rgba(248,250,252,0.42)' : 'rgba(15,18,38,0.40)';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    if (mode === 'forgot') {
      if (!email.trim()) { setMsg('Please enter your email address.'); return; }
      setBusy(true);
      const result = await doForgotPassword(email.trim());
      setBusy(false);
      if (!result.success) {
        setMsg(result.error || 'Failed to send reset email. Please try again.');
      } else {
        setMsg(`If an account exists for ${email.trim()}, a reset link has been sent. Check your inbox.`);
      }
      return;
    }

    if (mode === 'signup') {
      const h = safe(handle) || safe(email).split('@')[0] || 'creator';
      const n = safe(name) || h;
      if (!email.trim() || !password) { setMsg('Email and password are required.'); return; }
      if (password.length < 6) { setMsg('Password must be at least 6 characters.'); return; }
      setBusy(true);
      const result = await doSignUp({ email: email.trim(), password, displayName: n, username: h });
      setBusy(false);
      if (!result.success) {
        setMsg(result.error || 'Registration failed. Please try again.');
        return;
      }
      if (result.needsEmailConfirmation) {
        setMsg('Account created! Please check your email to confirm your address before signing in.');
        return;
      }
      // Welcome Vicoins bonus
      addLedgerEntry({
        id: 'vc-' + Date.now(), kind: 'earn', amount: 25,
        reason: 'Welcome to Vio', source: 'signup',
        ref_post_id: '', created_at: new Date().toISOString()
      });
      onAuthed({ handle: h, name: n });
      return;
    }

    // Sign in
    if (!email.trim() || !password) { setMsg('Email and password are required.'); return; }
    setBusy(true);
    const result = await doSignIn({ email: email.trim(), password });
    setBusy(false);
    if (!result.success) {
      setMsg(result.error || 'Invalid email or password. Please try again.');
      return;
    }
    onAuthed({ handle: result.handle || email.trim().split('@')[0], name: result.name || email.trim().split('@')[0] });
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans" style={{ background: bg, color: text }}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full opacity-[0.28]" style={{ background: `radial-gradient(closest-side, ${V.royal}, transparent 70%)`, filter: 'blur(30px)' }} />
        <div className="absolute -bottom-32 -right-32 w-[520px] h-[520px] rounded-full opacity-[0.22]" style={{ background: `radial-gradient(closest-side, ${V.gold}, transparent 70%)`, filter: 'blur(20px)' }} />
      </div>

      <div className="relative flex items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2.5">
          <VioMark size={28} useGradient gradientId="authTopGrad" />
          <span className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: text }}>Vio</span>
        </div>
        <button onClick={() => setDark(!dark)} className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: surface, border: `1px solid ${border}` }} aria-label="Toggle theme">
          {dark ? <Sun size={15} style={{ color: V.gold }} /> : <Moon size={15} style={{ color: V.royal }} />}
        </button>
      </div>

      <div className="relative max-w-md mx-auto px-6 pt-16 pb-24">
        <div className="mb-10" style={{ animation: 'vRise 480ms cubic-bezier(0.22,1,0.36,1) both' }}>
          <div className="text-[11px] font-medium tracking-[0.16em] uppercase mb-4" style={{ color: muted }}>
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Your creator journey'}
            {mode === 'forgot' && 'Reset your access'}
          </div>
          <h1 className="text-[36px] leading-[1.08] font-semibold tracking-[-0.03em]" style={{ color: text }}>
            {mode === 'signin' && <>Continue<br/>your story.</>}
            {mode === 'signup' && <>Where value<br/>gets discovered.</>}
            {mode === 'forgot' && <>We'll help you<br/>back in.</>}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: sub }}>
            {mode === 'signin' && 'Pick up where you left off.'}
            {mode === 'signup' && 'Not popularity. Quality.'}
            {mode === 'forgot' && 'Enter the email you signed up with.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[28px] p-6 sm:p-7 relative overflow-hidden"
          style={{
            background: surface,
            border: `1px solid ${border}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            animation: 'vRise 560ms cubic-bezier(0.22,1,0.36,1) 60ms both',
          }}>
          <div className="absolute top-0 left-6 right-6 h-[1px]" style={gradientStyle(90)} />

          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 rounded-full mb-6" style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,18,38,0.04)' }}>
              <button type="button" onClick={() => setMode('signin')}
                className="py-2.5 text-[13px] font-medium rounded-full transition-all duration-200"
                style={{ background: mode === 'signin' ? (dark ? 'rgba(255,255,255,0.08)' : '#FFFFFF') : 'transparent', color: mode === 'signin' ? text : sub, boxShadow: mode === 'signin' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>
                Sign in
              </button>
              <button type="button" onClick={() => setMode('signup')}
                className="py-2.5 text-[13px] font-medium rounded-full transition-all duration-200"
                style={{ background: mode === 'signup' ? (dark ? 'rgba(255,255,255,0.08)' : '#FFFFFF') : 'transparent', color: mode === 'signup' ? text : sub, boxShadow: mode === 'signup' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>
                Create account
              </button>
            </div>
          )}

          <div className="space-y-3.5">
            {mode === 'signup' && <AuthField icon={AtSign} placeholder="Choose your handle" value={handle} onChange={setHandle} prefix="@" dark={dark} />}
            {mode === 'signup' && <AuthField icon={User} placeholder="Display name" value={name} onChange={setName} dark={dark} />}
            <AuthField icon={Mail} placeholder="Email" type="email" value={email} onChange={setEmail} dark={dark} />
            {mode !== 'forgot' && <AuthField icon={Lock} placeholder="Password" type="password" value={password} onChange={setPassword} dark={dark} />}
          </div>

          {mode === 'signin' && (
            <div className="mt-3 text-right">
              <button type="button" onClick={() => setMode('forgot')} className="text-[12.5px] font-medium transition-colors" style={{ color: sub }}>Forgot password?</button>
            </div>
          )}
          {mode === 'forgot' && (
            <div className="mt-3">
              <button type="button" onClick={() => setMode('signin')} className="text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors" style={{ color: sub }}>
                <ArrowLeft size={12} /> Back to sign in
              </button>
            </div>
          )}

          {msg && (
            <div className="mt-4 rounded-2xl p-3 text-[13px]" style={{ background: msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('required') ? `${V.red}14` : `${V.royal}14`, border: msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('required') ? `1px solid ${V.red}33` : `1px solid ${V.royal}33`, color: text }}>{msg}</div>
          )}

          <button type="submit" disabled={busy}
            className="mt-6 w-full py-3.5 rounded-2xl text-[14.5px] font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-70 relative overflow-hidden"
            style={{ ...gradientStyle(120), boxShadow: '0 12px 32px -14px rgba(91,61,245,0.50)' }}>
            <span className="relative inline-flex items-center justify-center gap-2">
              {busy && <Loader2 size={14} className="animate-spin" />}
              {mode === 'signin' && (busy ? 'Signing in…' : 'Sign in')}
              {mode === 'signup' && (busy ? 'Creating your Vio…' : 'Create Vio account')}
              {mode === 'forgot' && (busy ? 'Sending…' : 'Send reset link')}
            </span>
          </button>

          <p className="mt-5 text-[11.5px] leading-relaxed text-center" style={{ color: muted }}>
            By continuing, you agree to Vio's Terms and acknowledge our Privacy Policy.
          </p>
        </form>

        <div className="mt-8 text-center text-[12.5px]" style={{ color: muted }}>
          Vio · Where creators are discovered by value, not volume.
        </div>
      </div>
    </div>
  );
}
function AuthField({ icon: Icon, placeholder, value, onChange, type = 'text', prefix, dark }) {
  const border = dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,18,38,0.10)';
  const focusBorder = dark ? 'rgba(255,255,255,0.24)' : 'rgba(15,18,38,0.20)';
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : '#FAFAF8';
  const text = dark ? '#F8FAFC' : V.ink;
  const muted = dark ? 'rgba(248,250,252,0.50)' : 'rgba(15,18,38,0.44)';
  const [focused, setFocused] = useState(false);
  const inputId = useMemo(() => 'auth-field-' + Math.random().toString(36).slice(2, 8), []);
  return (
    <div className="flex items-center gap-2.5 h-[56px] px-4 rounded-2xl transition-all duration-250"
      style={{ background: inputBg, border: `1px solid ${focused ? focusBorder : border}`, boxShadow: focused ? `0 0 0 4px ${V.royal}18` : 'none' }}>
      <label htmlFor={inputId} className="sr-only">{placeholder}</label>
      <Icon size={17} style={{ color: focused ? V.electric : muted, minWidth: 17 }} aria-hidden="true" />
      {prefix && <span className="text-[14px] font-medium" style={{ color: muted }} aria-hidden="true">{prefix}</span>}
      <input id={inputId} type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        autoComplete={type === 'email' ? 'email' : type === 'password' ? 'current-password' : 'off'}
        autoCorrect="off" autoCapitalize="none" spellCheck="false"
        className="flex-1 bg-transparent text-[15px] font-medium placeholder:font-normal placeholder:opacity-70" style={{ color: text }} />
    </div>
  );
}

export default AuthScreen;
