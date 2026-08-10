import React from 'react';
import { User, Coins, Settings, Bell, Sun, Languages, EyeOff, BookOpen, Shield, FileText, LockKeyhole, Info, Flag, ChevronRight, LogOut, Bookmark, MessagesSquare } from 'lucide-react';
import { V, gradientStyle } from '../../utils/design-system.js';
import VioMark from '../ui/VioMark.jsx';

function Drawer({ ui, open, onClose, setTab, setDark, onSignOut, onProfileClick }) {
  const sections = [
    { label: 'Account', items: [
      { icon: User, label: 'My Profile', action: 'profile' },
      { icon: Coins, label: 'Wallet', action: 'wallet' },
      { icon: Settings, label: 'Settings', action: 'settings' },
      { icon: Bell, label: 'Notifications', action: 'notifications' },
      { icon: Bookmark, label: 'Saved Posts', action: 'saved' },
      { icon: MessagesSquare, label: 'Messages', action: 'messages' },
    ]},
    { label: 'Preferences', items: [
      { icon: Sun, label: 'Appearance', action: 'theme' },
      { icon: Languages, label: 'Language', action: null },
      { icon: EyeOff, label: 'Privacy', action: null },
    ]},
    { label: 'Resources', items: [
      { icon: BookOpen, label: 'Help Centre', action: 'legal:help' },
      { icon: Shield, label: 'Community Guidelines', action: 'legal:guidelines' },
      { icon: FileText, label: 'Terms of Service', action: 'legal:tos' },
      { icon: LockKeyhole, label: 'Privacy Policy', action: 'legal:privacy' },
    ]},
    { label: 'Vio', items: [
      { icon: Info, label: 'About Vio', action: 'legal:about' },
      { icon: Flag, label: 'Report a Problem', action: null },
    ]},
  ];
  const handleAction = (action) => {
    onClose();
    if (action === 'profile') { if (onProfileClick) onProfileClick(); else setTab('profile'); }
    else if (action === 'settings') setTab('settings');
    else if (action === 'theme') setDark(!ui.dark);
    else if (action === 'notifications') setTab('notifications');
    else if (action === 'saved') setTab('saved');
    else if (action === 'messages') setTab('messages');
    else if (action === 'wallet') setTab('wallet');
    else if (action && action.startsWith('legal:')) {
      // Store the legal sub-page for LegalScreen to read
      sessionStorage.setItem('vio-legal-page', action.split(':')[1]);
      setTab('legal');
    }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex" style={{ animation: 'vOverlayIn 200ms ease-out' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[300px] max-w-[80vw] h-full overflow-y-auto" style={{ background: ui.dark ? V.darkest : V.light, animation: 'vDrawerIn 280ms cubic-bezier(0.22,1,0.36,1)' }}>
        {/* Drawer header */}
        <div className="sticky top-0 z-10 px-5 pt-8 pb-4" style={{ background: ui.dark ? V.darkest : V.light }}>
          <div className="flex items-center gap-3">
            <div className="w-42 h-42 rounded-2xl flex items-center justify-center" style={{ ...gradientStyle(140), width: 42, height: 42 }}>
              <VioMark size={22} color="white" />
            </div>
            <div>
              <div className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: ui.textPrimary }}>Vio</div>
              <div className="text-[11px]" style={{ color: ui.textMuted }}>Where value gets discovered</div>
            </div>
          </div>
        </div>

        {/* Drawer user card */}
        <div className="mx-4 rounded-2xl p-4 flex items-center gap-3" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
          {ui.avatarUrl ? (
            <img src={ui.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-semibold" style={gradientStyle(135)}>
              {(ui.displayName || ui.handle || 'V').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold truncate" style={{ color: ui.textPrimary }}>{ui.displayName || ui.handle || 'You'}</div>
            <div className="text-[11px]" style={{ color: ui.textMuted }}>@{ui.handle || 'you'}</div>
          </div>
          <ChevronRight size={14} style={{ color: ui.textMuted }} />
        </div>

        {/* Drawer sections */}
        <div className="px-4 pt-5 pb-8">
          {sections.map((section, si) => (
            <div key={si} className="mb-5">
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase px-2 mb-1.5" style={{ color: ui.textMuted }}>{section.label}</div>
              <div className="rounded-2xl overflow-hidden" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
                {section.items.map((item, ii) => {
                  const Icon = item.icon;
                  return (
                    <button key={ii} onClick={() => handleAction(item.action)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 hover:brightness-105" style={{ color: ui.textPrimary, borderTop: ii > 0 ? `1px solid ${ui.border}` : 'none' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${V.royal}15` }}>
                        <Icon size={14} style={{ color: V.royal }} />
                      </div>
                      <span className="text-[13.5px] font-medium flex-1">{item.label}</span>
                      <ChevronRight size={13} style={{ color: ui.textMuted }} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Sign out */}
          <button onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-colors" style={{ background: `${V.red}10`, border: `1px solid ${V.red}25`, color: V.red }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${V.red}15` }}>
              <LogOut size={14} />
            </div>
            <span className="text-[13.5px] font-semibold">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}


export default Drawer;
