import React, { useState, useEffect, useRef } from 'react';
import { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from '../utils/design-system.js';
import { Bell, BellRing, Heart, MessageCircle, TrendingUp, Award, UserPlus, Loader2, ThumbsUp, Smile } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { useVioStore, doLoadNotifications, doMarkAsRead, doMarkAllAsRead, doClearNotifications } from '../store/index.js';

const REACTION_NOTIF_ICONS = {
  like: { icon: ThumbsUp, color: '#3B82F6' },
  love: { icon: Heart,    color: '#EF4444' },
  haha: { icon: Smile,    color: '#F59E0B' },
};

const REACTION_NOTIF_LABELS = {
  like: 'Like', love: 'Love', haha: 'Haha',
};

function NotificationsScreen({ ui, onViewProfile }) {
  const { notifications, unreadCount } = useVioStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    doLoadNotifications().finally(() => setLoading(false));
  }, []);

  const notifIcon = (kind) => {
    switch (kind) {
      case 'like': return <ThumbsUp size={14} color="#3B82F6" strokeWidth={2} />;
      case 'comment': return <MessageCircle size={14} color={V.royal} />;
      case 'reply': return <MessageCircle size={14} color={V.electric} />;
      case 'follow': return <UserPlus size={14} color={V.gold} />;
      default: return <Bell size={14} color={ui.textMuted} />;
    }
  };

  const notifReactionIcon = (n) => {
    if (n.reaction && REACTION_NOTIF_ICONS[n.reaction]) {
      const RIcon = REACTION_NOTIF_ICONS[n.reaction].icon;
      return <RIcon size={16} color={REACTION_NOTIF_ICONS[n.reaction].color} fill={REACTION_NOTIF_ICONS[n.reaction].color} strokeWidth={2} />;
    }
    return null;
  };

  const notifText = (n) => {
    const actor = n.actor_name || n.actor_handle || 'Someone';
    switch (n.kind) {
      case 'like': {
        const label = REACTION_NOTIF_LABELS[n.reaction] || 'Like';
        return n.reaction && n.reaction !== 'like'
          ? `${actor} ${label.toLowerCase()}d your post`
          : `${actor} liked your post`;
      }
      case 'comment': return `${actor} commented on your post`;
      case 'reply': return `${actor} replied to your comment`;
      case 'follow': return `${actor} followed you`;
      default: return `New notification`;
    }
  };


  return (
    <section className="px-5 pt-5 pb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em]" style={{ color: ui.textPrimary }}>
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{ background: `${V.red}25`, color: V.red }}>{unreadCount}</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <>
              <button onClick={doMarkAllAsRead} className="text-[12px] font-medium transition-colors hover:opacity-70" style={{ color: V.electric }}>Mark all read</button>
              <button onClick={doClearNotifications} className="text-[12px] font-medium transition-colors hover:opacity-70" style={{ color: ui.textMuted }}>Clear</button>
            </>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: ui.textMuted }} /></div>}

      {!loading && notifications.length === 0 && (
        <EmptyState ui={ui} icon={Bell} title="No notifications yet" body="When someone likes your posts, comments, or follows you, you'll see it here." />
      )}

      {!loading && notifications.map((n, i) => (
        <button key={n.id || i} onClick={() => { if (!n.read) doMarkAsRead(n.id); if (n.kind === 'follow' && n.actor_id && onViewProfile) onViewProfile(n.actor_id); }}
          className="w-full rounded-2xl p-4 flex items-start gap-3 text-left transition-all duration-200 hover:-translate-y-[1px] mb-2"
          style={{
            background: n.read ? (ui.dark ? V.surfaceDark : '#FFFFFF') : (ui.dark ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.04)'),
            border: `1px solid ${n.read ? ui.border : V.electric}33`
          }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${V.royal}15` }}>
            {notifReactionIcon(n) || notifIcon(n.kind)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium leading-snug" style={{ color: ui.textPrimary }}>{notifText(n)}</div>
            <div className="text-[11px] mt-1" style={{ color: ui.textMuted }}>{timeAgo(n.created_at)}</div>
          </div>
          {!n.read && <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: V.electric }} />}
        </button>
      ))}
    </section>
  );
}

/* =====================================================================
   SETTINGS SCREEN
   ===================================================================== */

export default NotificationsScreen;
