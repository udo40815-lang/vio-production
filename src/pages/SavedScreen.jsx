import React, { useState, useEffect, useCallback } from 'react';
import { V } from '../utils/design-system.js';
import { Bookmark, Loader2 } from 'lucide-react';
import PostCard from '../components/feed/PostCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { doGetSavedPostsFull, doToggleSave } from '../store/index.js';

export default function SavedScreen({ ui, onViewProfile }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [myReactions, setMyReactions] = useState({});
  const [reactionCounts, setReactionCounts] = useState({});

  // Load saved posts
  const loadPosts = useCallback(async () => {
    setLoading(true);
    const result = await doGetSavedPostsFull();
    if (!result.error && result.posts) {
      setPosts(result.posts);
      setSavedIds(new Set(result.posts.map(p => p.id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Handle unsave directly
  const handleUnsave = useCallback(async (postId) => {
    // Optimistic
    setPosts(prev => prev.filter(p => p.id !== postId));
    setSavedIds(prev => { const n = new Set(prev); n.delete(postId); return n; });
    // Persist
    const result = await doToggleSave(postId);
    if (result.error) {
      // Rollback
      loadPosts();
    }
  }, [loadPosts]);

  const uiCtx = ui;

  if (loading) {
    return (
      <section className="px-5 pt-5 pb-8">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] mb-5" style={{ color: ui.textPrimary }}>Saved Posts</h2>
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin" style={{ color: ui.textMuted }} />
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section className="px-5 pt-5 pb-8">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] mb-5" style={{ color: ui.textPrimary }}>Saved Posts</h2>
        <EmptyState
          ui={ui}
          icon={Bookmark}
          title="No saved posts yet"
          body="Posts you save will appear here. Tap the bookmark icon on any post to save it."
        />
      </section>
    );
  }

  return (
    <section className="px-5 pt-5 pb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em]" style={{ color: ui.textPrimary }}>
          Saved Posts
          <span className="ml-2 text-[13px] font-normal" style={{ color: ui.textMuted }}>
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </span>
        </h2>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            ui={{
              ...uiCtx,
              currentUserId: uiCtx.currentUserId,
            }}
            likesCount={reactionCounts[post.id]?.total || 0}
            reactionCounts={reactionCounts[post.id] || null}
            myReaction={myReactions[post.id] || null}
            onLike={() => {}}
            onReact={() => {}}
            saved={true}
            onSave={() => handleUnsave(post.id)}
            onLikeCountClick={() => {}}
            isOwn={post.author_id === uiCtx.currentUserId}
          />
        ))}
      </div>
    </section>
  );
}
