import React, { useState, useEffect } from 'react';
import { ThumbsUp, Heart, X } from 'lucide-react';
import Avatar from '../components/ui/Avatar.jsx';
import { REACTION_CONFIG, REACTIONS, getPostLikers } from '../lib/reactions.js';
import { V } from '../utils/design-system.js';

const REACTION_ICON_MAP = {
  like: { icon: ThumbsUp, color: V.royal },
  love: { icon: Heart,    color: '#EF4444' },
};

const ALL_TABS = [
  { key: 'all', icon: null, label: 'All', color: null },
  ...REACTIONS.map(r => ({
    key: r,
    icon: REACTION_ICON_MAP[r]?.icon || null,
    label: REACTION_CONFIG[r]?.label || r,
    color: REACTION_ICON_MAP[r]?.color || V.royal,
  })),
];

function WhoLikedScreen({ post, ui, onClose }) {
  const [allLikers, setAllLikers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    (async () => {
      const result = await getPostLikers(post.id);
      setAllLikers(result.likers || []);
      setLoading(false);
    })();
  }, [post.id]);

  const filtered = activeTab === 'all'
    ? allLikers
    : allLikers.filter(l => l.reaction === activeTab);

  const counts = {};
  for (const l of allLikers) {
    counts[l.reaction] = (counts[l.reaction] || 0) + 1;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: ui.bg, display: 'flex', flexDirection: 'column', animation: 'slideUp 250ms cubic-bezier(0.16,1,0.3,1)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${ui.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: ui.textPrimary, cursor: 'pointer', padding: '4px' }}>
          <X size={20} strokeWidth={2} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: ui.textPrimary }}>Reactions</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', borderBottom: `1px solid ${ui.border}`, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {ALL_TABS.map(tab => {
          const TabIcon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? (tab.color || ui.textPrimary) : ui.textMuted,
                background: active ? (ui.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : 'transparent',
                border: active ? `1px solid ${ui.border}` : '1px solid transparent',
                borderRadius: 20,
                padding: '5px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 150ms',
                flexShrink: 0,
              }}
            >
              {TabIcon && <TabIcon size={14} color={tab.color} strokeWidth={2} />}
              {tab.label}
              {tab.key !== 'all' && <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 1 }}>{counts[tab.key] || 0}</span>}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: ui.textMuted, fontSize: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: ui.textMuted, fontSize: 14 }}>
            <ThumbsUp size={40} style={{ color: ui.textMuted, marginBottom: 8 }} />
            <div>{activeTab === 'all' ? 'No reactions yet' : `No ${REACTION_CONFIG[activeTab]?.label} reactions`}</div>
          </div>
        ) : (
          filtered.map((liker, i) => {
            const reactionData = REACTION_ICON_MAP[liker.reaction];
            const ReactionIcon = reactionData?.icon || ThumbsUp;
            return (
              <div key={`${liker.user_id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', transition: 'background 100ms' }}>
                <Avatar handle={liker.username} name={liker.display_name} src={liker.avatar_url} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: ui.textPrimary }}>{liker.display_name}</div>
                  <div style={{ fontSize: 12, color: ui.textMuted }}>@{liker.username}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <ReactionIcon size={20} color={reactionData?.color || V.royal} fill={reactionData?.color || V.royal} strokeWidth={2} />
                </div>
                {liker.user_id !== (ui?.currentUserId) && (
                  <button style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: V.royal, color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    Follow
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Inject slide-up animation
if (typeof document !== 'undefined' && !document.getElementById('who-liked-style')) {
  const style = document.createElement('style');
  style.id = 'who-liked-style';
  style.textContent = `
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

export default WhoLikedScreen;
