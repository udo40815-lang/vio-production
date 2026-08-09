import React, { useState, useEffect, useRef } from 'react';
import { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from '../utils/design-system.js';
import { Sparkles, Camera, Compass, Users, Sparkle } from 'lucide-react';
import { doToggleSave, doDeletePost, doUpdatePost, doSubmitReport, doLikePost, doReact, doLoadLikes } from '../store/index.js';
import { subscribeToLikes, getReactionCounts, getMyReactions } from '../lib/reactions.js';
import PostCard from '../components/feed/PostCard.jsx';
import MissionCard from '../components/feed/MissionCard.jsx';
import WhoLikedScreen from '../pages/WhoLikedScreen.jsx';
import OnboardingCard from '../components/feed/OnboardingCard.jsx';
import ValuePillars from '../components/feed/ValuePillars.jsx';

function HomeScreen({ ui, posts }) {
  const [myReactions, setMyReactions] = useState({});  
  const [reactionCounts, setReactionCounts] = useState({});
  const [likersPost, setLikersPost] = useState(null);  // post for reaction details screen
  const [savedIds, setSavedIds] = useState(new Set());
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const hasPosts = posts.length > 0;

  // Handle like with optimistic UI
  const handleLike = async (postId) => {
    const oldReaction = myReactions[postId] || null;
    const oldCounts = reactionCounts[postId] || { total: 0, top3: [], countsByType: {} };
    const oldTotal = oldCounts.total;
    if (oldReaction === 'like') {
      setMyReactions(prev => { const n = { ...prev }; delete n[postId]; return n; });
      setReactionCounts(prev => ({ ...prev, [postId]: {
        ...oldCounts, total: Math.max(0, oldTotal - 1),
        countsByType: { ...(oldCounts.countsByType || {}), like: Math.max(0, (oldCounts.countsByType?.like || 0) - 1) }, top3: [],
      }}));
    } else if (oldReaction === 'love') {
      setMyReactions(prev => ({ ...prev, [postId]: 'like' }));
      setReactionCounts(prev => ({ ...prev, [postId]: {
        ...oldCounts,
        countsByType: { ...(oldCounts.countsByType || {}), love: Math.max(0, (oldCounts.countsByType?.love || 0) - 1), like: (oldCounts.countsByType?.like || 0) + 1 }, top3: [],
      }}));
    } else {
      setMyReactions(prev => ({ ...prev, [postId]: 'like' }));
      setReactionCounts(prev => ({ ...prev, [postId]: {
        ...oldCounts, total: oldTotal + 1,
        countsByType: { ...(oldCounts.countsByType || {}), like: (oldCounts.countsByType?.like || 0) + 1 }, top3: [],
      }}));
    }
    const result = await doLikePost(postId);
    if (!result.error) {
      const { counts } = await getReactionCounts([postId]);
      setReactionCounts(prev => ({ ...prev, [postId]: counts[postId] || { total: 0, top3: [], countsByType: {} } }));
    }
  };

  // Handle specific reaction (from picker) — preserves countsByType
  const handleReact = async (postId, reaction) => {
    const oldReaction = myReactions[postId] || null;
    const oldCounts = reactionCounts[postId] || { total: 0, top3: [], countsByType: {} };
    const oldTotal = oldCounts.total;
    if (oldReaction === reaction) {
      setMyReactions(prev => { const n = { ...prev }; delete n[postId]; return n; });
      setReactionCounts(prev => ({ ...prev, [postId]: {
        ...oldCounts, total: Math.max(0, oldTotal - 1),
        countsByType: { ...(oldCounts.countsByType || {}), [reaction]: Math.max(0, (oldCounts.countsByType?.[reaction] || 0) - 1) }, top3: [],
      }}));
    } else if (oldReaction) {
      setMyReactions(prev => ({ ...prev, [postId]: reaction }));
      setReactionCounts(prev => ({ ...prev, [postId]: {
        ...oldCounts,
        countsByType: { ...(oldCounts.countsByType || {}), [oldReaction]: Math.max(0, (oldCounts.countsByType?.[oldReaction] || 0) - 1), [reaction]: (oldCounts.countsByType?.[reaction] || 0) + 1 }, top3: [],
      }}));
    } else {
      setMyReactions(prev => ({ ...prev, [postId]: reaction }));
      setReactionCounts(prev => ({ ...prev, [postId]: {
        ...oldCounts, total: oldTotal + 1,
        countsByType: { ...(oldCounts.countsByType || {}), [reaction]: (oldCounts.countsByType?.[reaction] || 0) + 1 }, top3: [],
      }}));
    }
    const result = await doReact(postId, reaction);
    if (!result.error) {
      const { counts } = await getReactionCounts([postId]);
      setReactionCounts(prev => ({ ...prev, [postId]: counts[postId] || { total: 0, top3: [], countsByType: {} } }));
    }
  };

  // Handle real save with Supabase
  const handleSave = async (postId) => {
    const already = savedIds.has(postId);
    // Optimistic update
    setSavedIds(s => { const n = new Set(s); already ? n.delete(postId) : n.add(postId); return n; });
    // Persist to Supabase
    await doToggleSave(postId);
  };

  // Initialize reaction counts from DB when posts load
  useEffect(() => {
    if (posts && posts.length) {
      const ids = posts.map(p => p.id);
      // Directly fetch
      getReactionCounts(ids).then(({ counts }) => {
        if (counts) {
          setReactionCounts(prev => {
            const next = { ...prev };
            for (const [pid, data] of Object.entries(counts)) {
              next[pid] = data;
            }
            return next;
          });
        }
      });
      getMyReactions(ids).then(({ reactions }) => {
        if (reactions) setMyReactions(reactions);
      });
    }
  }, [posts]);

  // Realtime reaction sync — fetches full counts including top3 emojis
  useEffect(() => {
    // Debounce: coalesce rapid changes to a single DB call per post
    let pending = {};
    let timer = null;

    const unsub = subscribeToLikes((payload) => {
      const postId = payload.new?.post_id || payload.old?.post_id;
      if (!postId) return;
      pending[postId] = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const ids = Object.keys(pending);
        pending = {};
        const { counts } = await getReactionCounts(ids);
        setReactionCounts(prev => {
          const next = { ...prev };
          for (const [pid, data] of Object.entries(counts)) {
            next[pid] = data;
          }
          // Zero out posts that no longer have reactions
          for (const pid of ids) {
            if (!counts[pid]) next[pid] = { total: 0, top3: [], countsByType: {} };
          }
          return next;
        });
      }, 80); // 80ms debounce
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    const result = await doDeletePost(id);
    if (!result.success) alert(result.error || 'Failed to delete post.');
  };

  const handleEdit = (post) => {
    setEditingPost(post.id);
    setEditContent(post.content || '');
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    await doUpdatePost(editingPost, { content: editContent.trim() });
    setEditingPost(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditContent('');
  };

  return (
    <>
    <section className="pb-8">
      {!hasPosts && (
        <div className="px-3 pt-3">
          <div className="relative rounded-3xl p-6 overflow-hidden mb-6" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
            <div className="absolute inset-0 opacity-[0.5] pointer-events-none" style={softGradientStyle(120, 0.08)} />
            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ ...gradientStyle(140), boxShadow: `0 8px 24px -8px ${V.royal}50`, animation: 'vFloat 5s ease-in-out infinite' }}>
                <Sparkles size={24} className="text-white" />
              </div>
              <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.03em]" style={{ color: ui.textPrimary }}>Welcome to Vio</h2>
              <p className="mt-2 text-[14px] leading-relaxed max-w-xs" style={{ color: ui.textSecondary }}>
                Your feed will fill with content from creators you follow. For now, here's how to get started.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <OnboardingCard ui={ui} icon={Camera} title="Create your first post" body="Share your work with the world. Posts are ranked by craft, not follower count." color={V.royal} onClick={() => { const e = document.getElementById('vio-nav-create'); if (e) e.click(); }} />
            <OnboardingCard ui={ui} icon={Compass} title="Discover communities" body="Browse categories like Design, Technology, Writing, and more." color={V.gold} onClick={() => { const e = document.querySelector('[aria-label="Discover"]'); if (e) e.click(); }} />
            <OnboardingCard ui={ui} icon={Users} title="Find creators to follow" body="Search for creators whose work you admire and follow their journey." color={V.electric} onClick={() => { const e = document.querySelector('[aria-label="Search"]'); if (e) e.click(); }} />
          </div>

          <MissionCard ui={ui} />
          <ValuePillars ui={ui} />
        </div>
      )}

      {editingPost && (
        <div className="px-3 pt-3">
          <div className="rounded-3xl p-5" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${V.electric}55`, boxShadow: `0 0 0 4px ${V.electric}18` }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={14} style={{ color: V.electric }} />
              <span className="text-[13px] font-semibold" style={{ color: ui.textPrimary }}>Editing post</span>
            </div>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
              className="w-full bg-transparent resize-none text-[15px] leading-relaxed p-3 rounded-2xl"
              style={{ color: ui.textPrimary, border: `1px solid ${ui.border}` }} />
            <div className="flex items-center gap-2 mt-3">
              <button onClick={handleSaveEdit} disabled={!editContent.trim()}
                className="h-9 px-5 rounded-full text-[13px] font-semibold text-white transition-all duration-200 hover:brightness-110 disabled:opacity-50"
                style={{ ...gradientStyle(120) }}>Save changes</button>
              <button onClick={handleCancelEdit}
                className="h-9 px-5 rounded-full text-[13px] font-medium transition-all duration-200"
                style={{ background: ui.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,18,38,0.06)', color: ui.textSecondary }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {hasPosts && (
        <div className="space-y-2">
          <div className="px-2">
            <MissionCard ui={ui} compact />
          </div>
          {posts.map((p, i) => (
            <div key={p.id || i} className="px-2">
              <PostCard post={p} ui={ui}
                likesCount={reactionCounts[p.id]?.total !== undefined ? reactionCounts[p.id].total : (p.likes_count || 0)}
                reactionCounts={reactionCounts[p.id] || null}
                myReaction={myReactions[p.id] || null}
                saved={savedIds.has(p.id)}
                isOwn={p.author_id === ui.currentUserId}
                onLike={() => handleLike(p.id)}
                onReact={(reaction) => handleReact(p.id, reaction)}
                onLikeCountClick={() => setLikersPost(p)}
                onSave={() => handleSave(p.id)}
                onEdit={handleEdit}
                onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}
    </section>
      {likersPost && <WhoLikedScreen post={likersPost} ui={ui} onClose={() => setLikersPost(null)} />}
    </>
  );
}

export default HomeScreen;
