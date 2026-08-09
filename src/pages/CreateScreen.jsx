import React, { useState, useEffect, useRef } from 'react';
import { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from '../utils/design-system.js';
import { Sparkle, Image as ImageIcon, Film, Play, FileText, BarChart3, Camera, Loader2, Download, Clock, Users, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import Avatar from '../components/ui/Avatar.jsx';
import VioMark from '../components/ui/VioMark.jsx';
import { uploadFileLocally, doCreatePost } from '../store/index.js';

function CreateScreen({ ui, onCreated }) {
  const [text, setText] = useState('');
  const [mediaKind, setMediaKind] = useState('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [expand, setExpand] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(10);
    setUploadError('');

    // Validate file
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      setUploadError(`File too large. Maximum size is ${maxMB} MB.`);
      setUploading(false);
      setUploadProgress(0);
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      setUploadError(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM.`);
      setUploading(false);
      setUploadProgress(0);
      return;
    }

    setUploadProgress(40);
    // Store the real File for Supabase upload
    setMediaFile(file);
    // Also generate a base64 preview for the UI
    const up = await uploadFileLocally(file);
    if (up.success && up.url) {
      setMediaUrl(up.url);
      setMediaKind(file.type.startsWith('video/') ? 'video' : 'photo');
      setUploadProgress(100);
    } else {
      setUploadError(up.error || 'Failed to process file. Please try again.');
    }
    setUploading(false);
  };

  const saveDraft = () => {
    const draft = { content: text, mediaKind, mediaUrl };
    try {
      const drafts = JSON.parse(localStorage.getItem('vio.drafts') || '[]');
      drafts.unshift({ ...draft, id: 'd-' + Date.now(), savedAt: new Date().toISOString() });
      localStorage.setItem('vio.drafts', JSON.stringify(drafts.slice(0, 10)));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (e) {
      // localStorage might be full or unavailable
    }
  };

  const publish = async () => {
    setBusy(true);
    const kind = mediaKind === 'photo' ? 'image' : mediaKind === 'video' ? 'video' : 'text';
    const result = await doCreatePost({
      content: text.trim(),
      mediaFile: mediaFile,
      mediaKind: kind,
    });
    setBusy(false);
    if (result.success) {
      onCreated?.();
    } else {
      alert(result.error || 'Failed to publish post. Please try again.');
    }
  };

  const chars = text.length;
  const canPublish = text.trim().length > 0 && !busy;

  const postTypes = [
    { id: 'text', label: 'Post', icon: Sparkle },
    { id: 'photo', label: 'Photo', icon: ImageIcon },
    { id: 'video', label: 'Video', icon: Film },
    { id: 'reel', label: 'Reel', icon: Play },
    { id: 'doc', label: 'Doc', icon: FileText },
    { id: 'poll', label: 'Poll', icon: BarChart3 },
  ];

  const advanceOptions = [
    { id: 'draft', label: 'Save draft', icon: Download },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'audience', label: 'Audience', icon: Users },
  ];

  return (
    <section className="px-5 pt-5 pb-8">
      <div className="rounded-3xl overflow-hidden relative" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
        {/* Post type selector */}
        <div className="flex overflow-x-auto v-scroll px-4 pt-4 pb-2 gap-1.5">
          {postTypes.map(t => {
            const Icon = t.icon;
            const active = mediaKind === t.id || (mediaKind === 'gradient' && t.id === 'text');
            return (
              <button key={t.id} onClick={() => setMediaKind(t.id)}
                className="shrink-0 h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-all duration-200"
                style={{ background: active ? (ui.dark ? 'rgba(124,58,237,0.14)' : 'rgba(124,58,237,0.08)') : (ui.dark ? V.surfaceDark : '#FAFAF8'), color: active ? (ui.dark ? '#DDD6FE' : V.royal) : ui.textSecondary, border: `1px solid ${active ? V.electric + '55' : ui.border}` }}>
                <Icon size={12} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Composer body */}
        <div className="px-5 pt-2 pb-2">
          <div className="flex gap-3">
            <div className="shrink-0 relative">
              {ui.avatarUrl ? <img src={ui.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" /> : <Avatar handle={ui.handle} name={ui.displayName} size={40} />}
            </div>
            <div className="flex-1">
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What do you want to share?"
                rows={5} className="w-full bg-transparent resize-none text-[15.5px] leading-relaxed" style={{ color: ui.textPrimary }} />
              {mediaKind === 'text' && !mediaUrl && <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: '4/5', ...gradientStyle(140) }}><div className="absolute inset-0 flex items-center justify-center"><VioMark size={56} color="rgba(255,255,255,0.88)" /></div></div>}
              {(mediaKind === 'photo' || mediaKind === 'video') && mediaUrl && (
                <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '4/5', background: '#000' }}>
                  {mediaKind === 'video' ? <video src={mediaUrl} controls className="w-full h-full object-cover" /> : <img src={mediaUrl} className="w-full h-full object-cover" alt="" />}
                </div>
              )}
            </div>
          </div>

          {/* Upload button + progress */}
          <div className="flex items-center gap-2 mt-3 ml-[52px]">
            <button onClick={() => document.getElementById('vio-file-input-v14')?.click()} className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95" style={{ background: ui.dark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.08)', border: `1px solid ${V.electric}33` }}>
              <Camera size={14} style={{ color: V.electric }} />
            </button>
            <input id="vio-file-input-v14" type="file" accept="image/*,video/*" className="hidden" onChange={e => upload(e.target.files?.[0])} />
            {uploading && (
              <div className="flex-1 max-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 size={12} className="animate-spin" style={{ color: ui.textMuted }} />
                  <span className="text-[11px]" style={{ color: ui.textMuted }}>Processing...</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: ui.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,18,38,0.08)' }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ ...gradientStyle(90), width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
            {uploadError && (
              <span className="text-[11px] font-medium" style={{ color: V.red }}>{uploadError}</span>
            )}
            {draftSaved && (
              <span className="text-[11px] font-medium" style={{ color: V.green }}>Draft saved</span>
            )}
          </div>
        </div>

        {/* Advanced options */}
        <div className="px-4 pb-1">
          <button onClick={() => setExpand(!expand)} className="w-full flex items-center gap-2 py-2.5 text-[12.5px] font-medium" style={{ color: ui.textMuted }}>
            <Sliders size={13} /> Advanced {expand ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {expand && (
            <div className="pb-3 grid grid-cols-3 gap-2">
              {advanceOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.id} onClick={opt.id === 'draft' ? saveDraft : undefined} className="py-3 rounded-2xl text-center transition-all duration-200 hover:brightness-105" style={{ background: ui.dark ? V.surfaceDark : '#FAFAF8', border: `1px solid ${ui.border}` }}>
                    <Icon size={15} style={{ color: ui.textSecondary }} />
                    <div className="text-[11px] font-medium mt-1" style={{ color: ui.textPrimary }}>{opt.label}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Publish bar */}
        <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderTop: `1px solid ${ui.border}` }}>
          <span className="text-[11.5px] font-medium" style={{ color: chars > 1000 ? V.red : ui.textMuted }}>{chars}</span>
          <div className="flex-1" />
          <button onClick={publish} disabled={!canPublish}
            className="h-11 px-6 rounded-full text-[14px] font-semibold text-white transition-all duration-200 hover:brightness-110 disabled:opacity-50 active:scale-[0.98]"
            style={{ ...gradientStyle(120), boxShadow: '0 12px 28px -14px rgba(91,61,245,0.50)' }}>
            {busy ? <span className="inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Publishing...</span> : 'Publish'}
          </button>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   WALLET SCREEN — Vicoins
   ===================================================================== */

export default CreateScreen;
