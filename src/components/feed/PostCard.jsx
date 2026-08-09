import React, { useState, memo, useCallback, useRef } from 'react';
import ReactionPicker from './ReactionPicker.jsx';
import { MessageCircle, Share2, Bookmark, MoreHorizontal, Check, Edit3, Trash2, Copy, Flag, Send, Loader2, ThumbsUp, Heart, Smile } from 'lucide-react';
import { V, safe, fmt, timeAgo, gradientStyle } from '../../utils/design-system.js';
import Avatar from '../ui/Avatar.jsx';
import PostGradientMedia from './PostGradientMedia.jsx';

import { doAddComment, doDeleteComment } from '../../store/index.js';
import { getPostComments } from '../../lib/comments.js';

// Icon map for reactions — keyed by the same DB values
const REACTION_ICON_MAP = {
  like: { icon: ThumbsUp, color: '#3B82F6', label: 'Like' },
  love: { icon: Heart,    color: '#EF4444', label: 'Love' },
  haha: { icon: Smile,    color: '#F59E0B', label: 'Haha' },
};

function PostCard({ post, ui, likesCount, reactionCounts, myReaction, onLike, onReact, onLikeCountClick, onSave, onEdit, onDelete, isOwn }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const longPressRef = useRef(null);
  const likeBtnRef = useRef(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const score = Number(post.visibility_score) || 0;
  const boost = safe(post.boost_status) || 'none';
  const displayLikesCount = likesCount !== undefined ? likesCount : (post.likes_count || 0);

  // Current reaction — icon, color, label
  const currentReaction = myReaction ? REACTION_ICON_MAP[myReaction] : null;

  // Top reaction icons for summary (first 3)
  const topReactionKeys = (reactionCounts?.top3 || []).slice(0, 3);

  // ── Like handler with long-press support ──
  const handleLike = useCallback(() => {
    if (showPicker) return;
    onLike?.();
  }, [onLike, showPicker]);

  const handlePressStart = useCallback(() => {
    longPressRef.current = setTimeout(() => setShowPicker(true), 400);
  }, []);

  const handlePressEnd = useCallback(() => {
    clearTimeout(longPressRef.current);
  }, []);

  const handleReactionSelect = useCallback((reaction) => {
    setShowPicker(false);
    onReact?.(reaction);
  }, [onReact]);

  const handleLikeCountClick = useCallback(() => {
    onLikeCountClick?.();
  }, [onLikeCountClick]);

  // ── Comments ──
  const loadComments = useCallback(async () => {
    if (commentsOpen) { setCommentsOpen(false); return; }
    setCommentsOpen(true);
    if (comments.length > 0) return;
    setCommentsLoading(true);
    const { comments: c } = await getPostComments(post.id);
    setComments(c || []);
    setCommentsLoading(false);
  }, [post.id, comments.length, commentsOpen]);

  const handleSubmitComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    const result = await doAddComment(post.id, text);
    setSubmitting(false);
    if (!result.error) {
      setCommentText('');
      setComments(prev => [...prev, { ...result.comment, replies: [] }]);
    }
  }, [commentText, submitting, post.id]);

  const handleDeleteComment = useCallback(async (commentId) => {
    await doDeleteComment(commentId, post.id);
    setComments(prev => prev.filter(c => c.id !== commentId));
  }, [post.id]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); }
  }, [handleSubmitComment]);

  return (
    <article
      className="rounded-3xl relative transition-all duration-300"
      style={{
        background: boost === 'active'
          ? `linear-gradient(135deg, ${V.gold}08, ${V.royal}08)`
          : (ui.dark ? V.surfaceDark : '#FFFFFF'),
        border: `1px solid ${ui.border}`,
        boxShadow: boost === 'active' ? `0 0 30px -8px ${V.gold}30` : (ui.dark ? 'none' : '0 1px 2px rgba(15,18,38,0.04)'),
      }}
      role="article"
    >
      {/* ── HEADER ── */}
      <div className="flex items-center gap-2.5 px-2 pt-2.5 pb-1.5">
        <Avatar handle={post.author_handle} name={post.author_name} src={post.author_avatar_url || undefined} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold truncate" style={{ color: ui.textPrimary }}>{post.author_name || post.author_handle}</span>
            <Check size={10} style={{ color: V.electric }} />
            {boost === 'active' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${V.gold}25`, color: V.gold }}>BOOSTED</span>}
          </div>
          <div className="text-[11px]" style={{ color: ui.textMuted }}>@{post.author_handle} · {timeAgo(post.created_at)}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${V.royal}14`, color: V.royal }}>{score}</div>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded-lg transition-colors hover:bg-black/5" aria-label="Post options"><MoreHorizontal size={15} style={{ color: ui.textMuted }} /></button>
            {showMenu && isOwn && (
              <div className="absolute right-0 top-9 z-20 rounded-xl py-1 shadow-lg min-w-[140px]" style={{ background: ui.dark ? V.dark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
                <button onClick={() => { setShowMenu(false); onEdit?.(post); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-black/5" style={{ color: ui.textPrimary }}><Edit3 size={13} /> Edit post</button>
                <button onClick={() => { setShowMenu(false); onDelete?.(post.id); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-black/5" style={{ color: V.red }}><Trash2 size={13} /> Delete post</button>
              </div>
            )}
            {showMenu && !isOwn && (
              <div className="absolute right-0 top-9 z-20 rounded-xl py-1 shadow-lg min-w-[140px]" style={{ background: ui.dark ? V.dark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
                <button onClick={() => { setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-black/5" style={{ color: ui.textPrimary }}><Flag size={13} /> Report</button>
                <button onClick={() => { setShowMenu(false); navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-black/5" style={{ color: ui.textSecondary }}><Copy size={13} /> Copy link</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CAPTION ── */}
      {post.content && (
        <div className="px-2 pb-2">
          <p className="text-[14px] leading-snug whitespace-pre-wrap break-words" style={{ color: ui.textPrimary }}>
            <span className="text-[14px] font-semibold mr-1.5" style={{ color: ui.textPrimary }}>{post.author_name || post.author_handle}</span>
            {post.content}
          </p>
        </div>
      )}

      {/* ── MEDIA ── */}
      {post.media_url && (
        <div className="mb-2">
          {post.media_kind === 'image' ? (
            <div className="w-full" style={{ aspectRatio: post.media_aspect || '4/5' }}>
              <img src={post.media_url} alt="Post media" loading="lazy" className="w-full h-full object-cover" />
            </div>
          ) : post.media_kind === 'reel' ? (
            <div className="w-full" style={{ aspectRatio: '9/16' }}>
              <video src={post.media_url} controls playsInline className="w-full h-full object-cover bg-black" />
            </div>
          ) : (
            <PostGradientMedia post={post} />
          )}
        </div>
      )}

      {/* ── TAGS ── */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-2 pb-1.5">
          {(typeof post.tags === 'string' ? safe(post.tags).split(',').slice(0, 3) : post.tags.slice(0, 3)).map((tag, i) => (
            <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${V.royal}10`, color: V.royal }}>{typeof tag === 'string' ? tag.trim() : tag}</span>
          ))}
        </div>
      )}

      {/* ── ACTION BAR ── */}
      <div className="px-2 pt-1.5 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Like button — ThumbsUp icon */}
            <div style={{ position: 'relative' }}>
              <button
                ref={likeBtnRef}
                onClick={handleLike}
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                className="-ml-1.5 transition-all duration-200 hover:scale-105 cursor-pointer"
                aria-label={`Like. ${displayLikesCount} reactions`}
                style={{
                  background: currentReaction ? `${currentReaction.color}14` : 'transparent',
                  border: 'none',
                  borderRadius: '24px',
                  padding: currentReaction ? '6px 14px' : '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {currentReaction ? (
                  <currentReaction.icon
                    size={18}
                    color={currentReaction.color}
                    fill={currentReaction.color}
                    strokeWidth={2}
                  />
                ) : (
                  <ThumbsUp
                    size={18}
                    color={ui.dark ? 'rgba(248,250,252,0.55)' : 'rgba(15,18,38,0.45)'}
                    strokeWidth={2}
                  />
                )}
                <span style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: currentReaction ? currentReaction.color : (ui.dark ? 'rgba(248,250,252,0.55)' : 'rgba(15,18,38,0.45)'),
                }}>
                  {currentReaction ? currentReaction.label : 'Like'}
                </span>
              </button>
              {showPicker && (
                <div style={{ position: 'absolute', bottom: '100%', left: -4, marginBottom: 6, zIndex: 30 }}>
                  <ReactionPicker
                    onSelect={handleReactionSelect}
                    onClose={() => setShowPicker(false)}
                  />
                </div>
              )}
            </div>

            {/* Comment button */}
            <button onClick={loadComments}
              className="transition-all duration-200 hover:scale-105 cursor-pointer"
              aria-label={`Comment. ${post.comments_count || 0} comments`}
              style={{ background: 'none', border: 'none', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '24px' }}
            >
              <MessageCircle size={18} style={{ color: ui.dark ? 'rgba(248,250,252,0.55)' : 'rgba(15,18,38,0.45)' }} strokeWidth={2} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: ui.dark ? 'rgba(248,250,252,0.55)' : 'rgba(15,18,38,0.45)' }}>Comment</span>
            </button>

            {/* Share button */}
            <button
              className="transition-all duration-200 hover:scale-105 cursor-pointer"
              aria-label="Share post"
              onClick={() => navigator.share?.({ url: `${window.location.origin}/post/${post.id}` }) || {}}
              style={{ background: 'none', border: 'none', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '24px' }}
            >
              <Share2 size={18} style={{ color: ui.dark ? 'rgba(248,250,252,0.55)' : 'rgba(15,18,38,0.45)' }} strokeWidth={2} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: ui.dark ? 'rgba(248,250,252,0.55)' : 'rgba(15,18,38,0.45)' }}>Share</span>
            </button>
          </div>

          {/* Save / Bookmark button */}
          <button onClick={() => onSave?.()}
            className="transition-all duration-200 hover:scale-105 cursor-pointer"
            aria-label={onSave ? 'Remove from saved' : 'Save post'}
            style={{ background: 'none', border: 'none', padding: '6px 8px', display: 'flex', alignItems: 'center', borderRadius: '24px' }}
          >
            <Bookmark
              size={18}
              strokeWidth={2}
              color={onSave ? V.gold : (ui.dark ? 'rgba(248,250,252,0.55)' : 'rgba(15,18,38,0.45)')}
              fill={onSave ? V.gold : 'transparent'}
            />
          </button>
        </div>

        {/* Like count & reaction summary */}
        <div className="mt-1.5 ml-0.5">
          {displayLikesCount > 0 ? (
            <button onClick={handleLikeCountClick} className="flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer" style={{ background: 'none', border: 'none', color: ui.textPrimary, padding: 0 }}>
              {topReactionKeys.length > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                  {topReactionKeys.map((key, i) => {
                    const r = REACTION_ICON_MAP[key];
                    if (!r) return null;
                    const SmallIcon = r.icon;
                    return <SmallIcon key={i} size={14} color={r.color} fill={r.color} strokeWidth={2} />;
                  })}
                </span>
              )}
              <span>{fmt(displayLikesCount)}</span>
            </button>
          ) : (
            <span className="text-[13px]" style={{ color: ui.textMuted }}>Be the first to like this</span>
          )}
        </div>
      </div>

      {/* ── COMMENTS LINK ── */}
      {(post.comments_count > 0 && !commentsOpen) && (
        <button onClick={loadComments} className="px-2 pb-2 text-[13px] cursor-pointer" style={{ color: ui.textMuted, background: 'none', border: 'none' }}>
          View {post.comments_count === 1 ? '1 comment' : `all ${post.comments_count} comments`}
        </button>
      )}

      {/* ── COMMENT THREAD ── */}
      {commentsOpen && (
        <div className="px-2 pb-3 pt-1" style={{ borderTop: `1px solid ${ui.border}` }}>
          {commentsLoading ? (
            <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin" style={{ color: ui.textMuted }} /></div>
          ) : comments.length === 0 ? (
            <p className="text-[12px] text-center py-2" style={{ color: ui.textMuted }}>No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-3 mb-3 pt-2">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar handle={c.author_handle} name={c.author_name} src={c.author_avatar_url || undefined} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-[12px] font-semibold" style={{ color: ui.textPrimary }}>{c.author_name || c.author_handle}</span>
                      <span className="text-[11px]" style={{ color: ui.textMuted }}>@{c.author_handle}</span>
                    </div>
                    <div className="text-[13px] leading-snug break-words mt-0.5" style={{ color: ui.textPrimary }}>{c.content}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px]" style={{ color: ui.textMuted }}>{timeAgo(c.created_at)}</span>
                      {(c.user_id === ui.currentUserId) && <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] font-medium hover:underline" style={{ color: V.red + 'aa', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>}
                    </div>
                    {c.replies && c.replies.length > 0 && (
                      <div className="mt-2 space-y-2 pl-4" style={{ borderLeft: `2px solid ${ui.border}` }}>
                        {c.replies.map((r) => (
                          <div key={r.id} className="flex gap-2">
                            <Avatar handle={r.author_handle} name={r.author_name} src={r.author_avatar_url || undefined} size={22} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-1 flex-wrap">
                                <span className="text-[11px] font-semibold" style={{ color: ui.textPrimary }}>{r.author_name || r.author_handle}</span>
                                <span className="text-[10px]" style={{ color: ui.textMuted }}>@{r.author_handle}</span>
                              </div>
                              <div className="text-[12px] leading-snug break-words mt-0.5" style={{ color: ui.textPrimary }}>{r.content}</div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[9px]" style={{ color: ui.textMuted }}>{timeAgo(r.created_at)}</span>
                                {(r.user_id === ui.currentUserId) && <button onClick={() => handleDeleteComment(r.id)} className="text-[9px] font-medium hover:underline" style={{ color: V.red + 'aa', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1.5" style={{ borderTop: `1px solid ${ui.border}` }}>
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Add a comment..." maxLength={500}
              className="flex-1 text-[13px] py-2 px-0 outline-none bg-transparent"
              style={{ color: ui.textPrimary }}
              aria-label="Add a comment" />
            <button onClick={handleSubmitComment} disabled={!commentText.trim() || submitting}
              className="text-[13px] font-semibold transition-all disabled:opacity-30"
              style={{ color: commentText.trim() ? V.royal : ui.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Post comment">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : 'Post'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default memo(PostCard);
