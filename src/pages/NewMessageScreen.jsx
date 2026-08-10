// ============================================================================
// Vio — New Message Screen
// Search for users to start a conversation with.
// ============================================================================

import React, { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, Search, Users, AlertCircle } from 'lucide-react';
import { V } from '../utils/design-system.js';
import { supabase } from '../lib/supabase.js';
import { getOrCreateConversation } from '../lib/messages.js';
import Avatar from '../components/ui/Avatar.jsx';

function NewMessageScreen({ ui, onBack, onOpenChat }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [selectingId, setSelectingId] = useState(null);
  const [convError, setConvError] = useState(null);

  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    const uid = ui.currentUserId;
    const { data, error: err } = await supabase
      .from('profiles').select('user_id, display_name, username, avatar_url')
      .or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
      .neq('user_id', uid || '').limit(30).order('username');
    setResults(data || []); setError(err); setLoading(false);
  }, [ui.currentUserId]);

  const handleSelect = async (profile) => {
    if (selectingId) return;
    setConvError(null); setSelectingId(profile.user_id);
    const { conversation, error: convErr } = await getOrCreateConversation(profile.user_id);
    if (convErr) { setConvError(convErr.message || 'Could not start conversation'); setSelectingId(null); return; }
    if (!conversation) { setConvError('Could not create or find this conversation.'); setSelectingId(null); return; }
    const convWithUser = { ...conversation, other_user: { user_id: profile.user_id, username: profile.username || '', display_name: profile.display_name || '', avatar_url: profile.avatar_url || '' } };
    setSelectingId(null); onOpenChat(convWithUser);
  };

  return (
    <section className="px-4 pt-3 pb-20">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-1 -ml-1 rounded-full" aria-label="Back"><ArrowLeft size={20} style={{ color: ui.textPrimary }} /></button>
        <h1 className="text-[20px] font-bold tracking-[-0.03em]" style={{ color: ui.textPrimary }}>New message</h1>
      </div>
      <div className="relative mb-4">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2"><Search size={16} style={{ color: ui.textMuted }} /></div>
        <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); }} placeholder="Search people..." autoFocus className="w-full h-[42px] pl-10 pr-4 rounded-xl text-[14px] outline-none" style={{ background: ui.dark ? V.surfaceDark : '#EBEBF0', color: ui.textPrimary }} />
      </div>
      {convError && (
        <div className="rounded-2xl p-4 mb-3 flex items-center gap-2" style={{ background: `${V.red}12`, border: `1px solid ${V.red}20` }}>
          <AlertCircle size={16} style={{ color: V.red }} /><span className="text-[13px]" style={{ color: V.red }}>{convError}</span>
          <button onClick={() => setConvError(null)} className="ml-auto text-[12px] font-medium" style={{ color: V.red }}>Dismiss</button>
        </div>
      )}
      {loading && (<div className="flex items-center justify-center py-12 gap-2" style={{ color: ui.textMuted }}><Loader2 size={16} className="animate-spin" /><span className="text-[13px]">Searching...</span></div>)}
      {error && !loading && (<div className="rounded-2xl p-6 text-center" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}><div className="text-[14px]" style={{ color: ui.textSecondary }}>Search failed. Try again.</div></div>)}
      {!loading && searched && !error && results.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
          <div className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${V.royal}12` }}><Users size={18} style={{ color: ui.textMuted }} /></div>
          <div className="text-[14px] font-semibold" style={{ color: ui.textPrimary }}>No users found</div>
          <div className="text-[12px] mt-1" style={{ color: ui.textMuted }}>Try a different name or handle</div>
        </div>
      )}
      {!loading && results.length > 0 && (
        <div className="space-y-0.5">
          {results.map((profile) => {
            const isSelecting = selectingId === profile.user_id;
            return (
              <button key={profile.user_id} onClick={() => handleSelect(profile)} disabled={isSelecting || !!selectingId}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-150 hover:brightness-105 active:scale-[0.99]"
                style={{ background: 'transparent', opacity: isSelecting ? 0.6 : 1 }}>
                <Avatar handle={profile.username || '?'} name={profile.display_name} src={profile.avatar_url || null} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate leading-snug" style={{ color: ui.textPrimary }}>{profile.display_name || profile.username || 'Unknown'}</div>
                  <div className="text-[12px]" style={{ color: ui.textMuted }}>@{profile.username || 'unknown'}</div>
                </div>
                {isSelecting && <Loader2 size={16} className="animate-spin" style={{ color: ui.textMuted }} />}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default NewMessageScreen;
