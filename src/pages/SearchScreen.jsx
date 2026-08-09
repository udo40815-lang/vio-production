import React, { useState, useEffect, useRef } from 'react';
import { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from '../utils/design-system.js';
import { Search, X, TrendingUp, Compass, User, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import Avatar from '../components/ui/Avatar.jsx';
import { doSearch } from '../store/index.js';

function SearchScreen({ ui, posts, onViewProfile }) {
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState({ profiles: [], posts: [] });
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimer = useRef(null);

  const trending = ['Design', 'Technology', 'Writing', 'Photography', 'Music', 'Creativity'];

  const handleSearch = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ profiles: [], posts: [] });
      setHasSearched(false);
      return;
    }

    // Debounce: wait 400ms after user stops typing
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      setHasSearched(true);
      const r = await doSearch(trimmed);
      setResults(r);
      setSearching(false);
    }, 400);
  };

  const onChange = (val) => {
    setQ(val);
    handleSearch(val);
  };

  const hasResults = results.profiles.length > 0 || results.posts.length > 0;

  return (
    <section className="px-5 pt-5 pb-8">
      <div className="rounded-full flex items-center gap-2.5 h-12 px-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-violet-500/20" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
        <Search size={16} style={{ color: ui.textMuted }} />
        <input value={q} onChange={e => onChange(e.target.value)} placeholder="Search creators, posts, and topics" className="flex-1 bg-transparent text-[14px] font-medium" style={{ color: ui.textPrimary }} type="search" />
        {q && <button onClick={() => { setQ(''); onChange(''); }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: ui.border }}><X size={12} style={{ color: ui.textSecondary }}/></button>}
      </div>

      {/* Searching indicator */}
      {searching && (
        <div className="mt-8 text-center">
          <Loader2 size={22} className="animate-spin mx-auto" style={{ color: ui.textMuted }} />
        </div>
      )}

      {/* Empty state — no query yet */}
      {!q && !searching && (
        <>
          {/* Trending searches */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: V.gold }} />
              <h3 className="text-[13px] font-semibold" style={{ color: ui.textPrimary }}>Trending</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {trending.map((t, i) => (
                <button key={i} onClick={() => onChange(t)} className="h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-all duration-200 hover:scale-[1.02] active:scale-95" style={{ background: ui.dark ? V.surfaceDark : '#FAFAF8', color: ui.textPrimary, border: `1px solid ${ui.border}` }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Suggested */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <Compass size={14} style={{ color: V.electric }} />
              <h3 className="text-[13px] font-semibold" style={{ color: ui.textPrimary }}>Browse by topic</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['Design', 'Technology', 'Writing', 'Photography', 'Music', 'Business'].map(t => (
                <button key={t} onClick={() => onChange(t)} className="rounded-2xl p-3.5 text-left transition-all duration-200 hover:-translate-y-[1px]" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
                  <div className="text-[13.5px] font-semibold" style={{ color: ui.textPrimary }}>{t}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: ui.textMuted }}>Explore creators and posts</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Results */}
      {!searching && hasSearched && (
        <>
          {!hasResults ? (
            <div className="mt-8 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${V.royal}15` }}>
                <Search size={22} style={{ color: ui.textMuted }} />
              </div>
              <div className="mt-4 text-[16px] font-semibold" style={{ color: ui.textPrimary }}>No results for "{q}"</div>
              <div className="mt-1.5 text-[13px] leading-relaxed" style={{ color: ui.textSecondary }}>Try searching for a different term or browse categories above.</div>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {/* Profiles found */}
              {results.profiles.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: ui.textPrimary }}>
                    <User size={14} style={{ color: V.royal }} />
                    Creators ({results.profiles.length})
                  </h3>
                  <div className="space-y-2">
                    {results.profiles.map((profile, i) => (
                      <button key={i} onClick={() => onViewProfile?.(profile.user_id)} className="rounded-2xl p-3.5 flex items-center gap-3 w-full text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
                        <Avatar handle={profile.username} name={profile.display_name} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold truncate" style={{ color: ui.textPrimary }}>{profile.display_name || profile.username}</div>
                          <div className="text-[12px]" style={{ color: ui.textMuted }}>@{profile.username} · {profile.followers_count || 0} followers</div>
                        </div>
                        <ChevronRight size={14} style={{ color: ui.textMuted }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts found */}
              {results.posts.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: ui.textPrimary }}>
                    <Sparkles size={14} style={{ color: V.electric }} />
                    Posts ({results.posts.length})
                  </h3>
                  <div className="space-y-4">
                    {results.posts.map((post) => (
                      <div key={post.id} className="rounded-2xl p-4" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
                        <div className="flex items-center gap-2.5 mb-2">
                          <Avatar handle={post.author_handle} name={post.author_name} src={post.author_avatar_url || undefined} size={28} />
                          <div>
                            <div className="text-[13px] font-semibold" style={{ color: ui.textPrimary }}>{post.author_name || post.author_handle}</div>
                            <div className="text-[11px]" style={{ color: ui.textMuted }}>@{post.author_handle} · {timeAgo(post.created_at)}</div>
                          </div>
                        </div>
                        {safe(post.content) && <p className="text-[14px] leading-relaxed" style={{ color: ui.textSecondary }}>{safe(post.content).slice(0, 200)}{safe(post.content).length > 200 ? '...' : ''}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* =====================================================================
   CREATE SCREEN — Professional Content Creation
   ===================================================================== */

export default SearchScreen;
