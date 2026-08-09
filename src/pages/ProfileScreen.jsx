import React, { useState, useEffect, useRef } from 'react';
import { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from '../utils/design-system.js';
import { Camera, Globe, MapPin, Calendar, Sparkles, Award, Play, FileText, Image as ImageIcon, Bookmark, Sparkle, ChevronRight, Plus, Eye, Clock, ArrowLeft, Loader2, UserPlus, ExternalLink, Briefcase, GraduationCap, Instagram, Linkedin, Github, Twitter, Music, Youtube } from 'lucide-react';
import Ring from '../components/ui/Ring.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import VicoinIcon from '../components/ui/VicoinIcon.jsx';
import VioMark from '../components/ui/VioMark.jsx';
import { doUploadAvatar, doUploadCover, doUpdateProfile, doGetProfileById, doGetPostsByUserId, doToggleFollow, doCheckFollow, doGetFollowers, doGetFollowing, doCreateNotification, useVioStore } from '../store/index.js';

function ProfileScreen({ ui, posts, viewingUserId, onBackToOwnProfile, onViewProfile, setTab }) {
  const [activeTab, setActiveTab] = useState('posts');
  const [viewingProfile, setViewingProfile] = useState(null);
  const [viewingPosts, setViewingPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingViewing, setLoadingViewing] = useState(false);
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [showFollowingList, setShowFollowingList] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const isOwnProfile = !viewingUserId;
  const [editing, setEditing] = useState(false);

  // Fetch viewing user's profile when viewingUserId changes
  useEffect(() => {
    if (!viewingUserId) {
      setViewingProfile(null);
      setViewingPosts([]);
      setIsFollowing(false);
      return;
    }
    setLoadingViewing(true);
    (async () => {
      const [profileResult, postsResult, followResult] = await Promise.all([
        doGetProfileById(viewingUserId),
        doGetPostsByUserId(viewingUserId),
        doCheckFollow(viewingUserId),
      ]);
      setViewingProfile(profileResult.profile || null);
      setViewingPosts(postsResult.posts || []);
      setIsFollowing(followResult.following || false);
      setLoadingViewing(false);
    })();
  }, [viewingUserId]);

  // Determine which data to display
  const displayProfile = viewingProfile || ui;
  const displayPosts = viewingUserId ? viewingPosts : (posts.filter(p => safe(p.author_handle) === safe(ui.handle)));
  const totalEarned = displayPosts.reduce((s, p) => s + (Number(p.vicoins_earned) || 0), 0);
  const avgScore = displayPosts.length ? Math.round(displayPosts.reduce((s, p) => s + (Number(p.visibility_score) || 0), 0) / displayPosts.length) : 0;
  const displayIsOwn = isOwnProfile;

  // Build display data — own profile uses ui context, others use fetched data
  const profileData = {
    handle: displayIsOwn ? ui.handle : (displayProfile?.username || 'unknown'),
    displayName: displayIsOwn ? ui.displayName : (displayProfile?.display_name || 'Unknown'),
    avatarUrl: displayIsOwn ? ui.avatarUrl : (displayProfile?.avatar_url || ''),
    coverUrl: displayIsOwn ? ui.coverUrl : (displayProfile?.cover_url || ''),
    bio: displayIsOwn ? ui.bio : (displayProfile?.bio || ''),
    website: displayIsOwn ? ui.website : (displayProfile?.website || ''),
    location: displayIsOwn ? ui.location : (displayProfile?.location || ''),
    joined: displayIsOwn ? ui.joined : (displayProfile?.created_at || ''),
    followersCount: displayIsOwn ? (ui.followersCount || 0) : (displayProfile?.followers_count || 0),
    followingCount: displayIsOwn ? (ui.followingCount || 0) : (displayProfile?.following_count || 0),
    reputation: displayIsOwn ? (ui.reputation || 0) : (displayProfile?.reputation || 0),
    userId: displayIsOwn ? ui.currentUserId : viewingUserId,
  };
  
  // Build about data — prioritises viewed profile, falls back to auth user
  const aboutData = {
    location: displayIsOwn ? ui.location : (displayProfile?.location || ''),
    website: displayIsOwn ? ui.website : (displayProfile?.website || ''),
    occupation: displayIsOwn ? (ui.occupation || '') : (displayProfile?.occupation || ''),
    company: displayIsOwn ? (ui.company || '') : (displayProfile?.company || ''),
    school: displayIsOwn ? (ui.school || '') : (displayProfile?.school || ''),
    education: displayIsOwn ? (ui.education || '') : (displayProfile?.education || ''),
    skills: displayIsOwn ? (Array.isArray(ui.skills) ? ui.skills : []) : (Array.isArray(displayProfile?.skills) ? displayProfile.skills : []),
    interests: displayIsOwn ? (Array.isArray(ui.interests) ? ui.interests : []) : (Array.isArray(displayProfile?.interests) ? displayProfile.interests : []),
    twitter: displayIsOwn ? (ui.twitter || '') : (displayProfile?.twitter || ''),
    instagram: displayIsOwn ? (ui.instagram || '') : (displayProfile?.instagram || ''),
    linkedin: displayIsOwn ? (ui.linkedin || '') : (displayProfile?.linkedin || ''),
    github: displayIsOwn ? (ui.github || '') : (displayProfile?.github || ''),
    tiktok: displayIsOwn ? (ui.tiktok || '') : (displayProfile?.tiktok || ''),
    youtube: displayIsOwn ? (ui.youtube || '') : (displayProfile?.youtube || ''),
  };
  const hasAbout = aboutData.location || aboutData.website || aboutData.occupation || aboutData.company || aboutData.school || aboutData.education || aboutData.skills.length > 0 || aboutData.interests.length > 0 || aboutData.twitter || aboutData.instagram || aboutData.linkedin || aboutData.github || aboutData.tiktok || aboutData.youtube;

  const [bioText, setBioText] = useState(ui.bio || '');
  const [websiteText, setWebsiteText] = useState(ui.website || '');
  const [locationText, setLocationText] = useState(ui.location || '');
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await doUploadAvatar(file);
    if (!result.success) {
      alert(result.error || 'Failed to upload avatar');
    }
  };
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await doUploadCover(file);
    if (!result.success) {
      alert(result.error || 'Failed to upload cover');
    }
  };
  const saveProfile = async () => {
    await doUpdateProfile({ bio: bioText, website: websiteText, location: locationText });
    setEditing(false);
  };

  const tabs = [
    { id: 'posts', label: 'Posts', icon: Sparkles },
    { id: 'reels', label: 'Reels', icon: Play },
    { id: 'docs', label: 'Docs', icon: FileText },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'saved', label: 'Saved', icon: Bookmark },
  ];

  // Show loading state
  if (loadingViewing) {
    return (
      <section className="pb-8">
        <button onClick={onBackToOwnProfile} className="flex items-center gap-1.5 text-[13px] font-medium px-5 pt-3 pb-2 -ml-1 p-1 rounded-lg transition-colors hover:bg-black/5" style={{ color: ui.textSecondary }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-center py-12">
          <div className="text-[14px]" style={{ color: ui.textMuted }}>Loading profile...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="pb-8">
      {/* Back button for other profiles */}
      {!displayIsOwn && (
        <button onClick={onBackToOwnProfile} className="flex items-center gap-1.5 text-[13px] font-medium px-5 pt-3 pb-2 -ml-1 p-1 rounded-lg transition-colors hover:bg-black/5" style={{ color: ui.textSecondary }}>
          <ArrowLeft size={16} /> Back
        </button>
      )}
      {/* Cover photo */}
      <div className="relative h-44 overflow-hidden cursor-pointer" onClick={() => coverInputRef.current?.click()} style={{ background: profileData.coverUrl ? 'transparent' : `linear-gradient(135deg, ${V.royal}25, ${V.electric}20 50%, ${V.gold}15)` }}>
        {profileData.coverUrl && <img src={profileData.coverUrl} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera size={22} className="text-white" />
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      </div>

      {/* Profile header */}
      <div className="px-5 relative -mt-12">
        <div className="flex items-end justify-between">
          <div className="relative cursor-pointer" onClick={() => avatarInputRef.current?.click()} style={{ width: 88, height: 88 }}>
            {profileData.avatarUrl ? (
              <img src={profileData.avatarUrl} alt="" className="w-full h-full rounded-full object-cover ring-[4px] ring-[#0B1020]" />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center text-white text-[28px] font-semibold ring-[4px] ring-[#0B1020]" style={gradientStyle(135)}>
                {(profileData.displayName || profileData.handle || 'V').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: ui.dark ? V.ink : '#FFFFFF', border: `2px solid ${ui.dark ? '#0B1020' : '#F8FAFC'}` }}>
              <Camera size={11} style={{ color: ui.textPrimary }} />
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          {displayIsOwn && (editing ? (
            <button onClick={saveProfile} className="h-[38px] px-4 rounded-full text-[12px] font-semibold text-white transition-all duration-200 active:scale-95" style={{ ...gradientStyle(120) }}>Save</button>
          ) : (
            <button onClick={() => setEditing(true)} className="h-[38px] px-4 rounded-full text-[12px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95" style={{ background: ui.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,18,38,0.06)', color: ui.textPrimary, border: `1px solid ${ui.border}` }}>Edit profile</button>
          ))}
        </div>

        {/* Name + username + Follow button */}
        <div className="mt-2 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[22px] font-semibold tracking-[-0.03em] leading-tight" style={{ color: ui.textPrimary }}>{profileData.displayName || profileData.handle || 'You'}</div>
            <div className="text-[14px] mt-0.5" style={{ color: ui.textMuted }}>@{profileData.handle || 'you'}</div>
          </div>
          {!displayIsOwn && (
            <button onClick={async () => {
              const targetUserId = viewingUserId;
              if (!targetUserId) return;
              // Optimistic UI: toggle immediately
              const wasFollowing = isFollowing;
              setIsFollowing(!wasFollowing);
              // Perform DB operation
              const result = await doToggleFollow(targetUserId);
              if (!result.error) {
                // Re-fetch profile from DB to get accurate counts
                const fresh = await doGetProfileById(targetUserId);
                setViewingProfile(fresh.profile || null);
                setIsFollowing(result.following);
                if (result.following) {
                  // Create notification only on follow
                  await doCreateNotification({
                    user_id: targetUserId,
                    actor_id: ui.currentUserId,
                    actor_handle: ui.handle,
                    actor_name: ui.displayName,
                    kind: 'follow',
                  });
                }
              } else {
                // Revert on error
                setIsFollowing(wasFollowing);
              }
            }} className="shrink-0 h-[34px] px-4 rounded-full text-[12px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95" style={isFollowing ? { background: ui.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,18,38,0.06)', color: ui.textPrimary, border: `1px solid ${ui.border}` } : { ...gradientStyle(120), color: '#FFF' }}>
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Info fields */}
        <div className="mt-3 space-y-1.5">
          {displayIsOwn && editing ? (
            <>
              <input value={bioText} onChange={e => setBioText(e.target.value)} placeholder="Write a short bio..." className="w-full bg-transparent text-[14px] py-1.5" style={{ color: ui.textPrimary }} />
              <div className="flex items-center gap-1.5"><Globe size={12} style={{ color: ui.textMuted }} /><input value={websiteText} onChange={e => setWebsiteText(e.target.value)} placeholder="Add website" className="flex-1 bg-transparent text-[13px] py-1" style={{ color: ui.textPrimary }} /></div>
              <div className="flex items-center gap-1.5"><MapPin size={12} style={{ color: ui.textMuted }} /><input value={locationText} onChange={e => setLocationText(e.target.value)} placeholder="Add location" className="flex-1 bg-transparent text-[13px] py-1" style={{ color: ui.textPrimary }} /></div>
            </>
          ) : (
            <>
              {(profileData.bio || bioText) && <p className="text-[14px] leading-relaxed" style={{ color: ui.textSecondary }}>{profileData.bio || bioText}</p>}
              {(profileData.website || websiteText) && <div className="flex items-center gap-1.5"><Globe size={12} style={{ color: V.electric }} /><a className="text-[13px] font-medium" style={{ color: V.electric }} href={profileData.website || websiteText.startsWith('http') ? (profileData.website || websiteText) : `https://${profileData.website || websiteText}`} target="_blank" rel="noopener">{(profileData.website || websiteText).replace(/^https?:\/\//, '')}</a></div>}
              {(profileData.location || locationText) && <div className="flex items-center gap-1.5"><MapPin size={12} style={{ color: ui.textMuted }} /><span className="text-[13px]" style={{ color: ui.textSecondary }}>{profileData.location || locationText}</span></div>}
              {profileData.joined && <div className="flex items-center gap-1.5"><Calendar size={12} style={{ color: ui.textMuted }} /><span className="text-[13px]" style={{ color: ui.textSecondary }}>Joined {new Date(profileData.joined).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span></div>}
            </>
          )}
        </div>

        {/* Stats row — tappable followers/following */}
        <div className="mt-4 flex items-center gap-4">
          <button onClick={async () => {
            const uid = viewingUserId || ui.currentUserId;
            if (!uid) return;
            setLoadingList(true);
            setShowFollowersList(true);
            const r = await doGetFollowers(uid);
            setFollowersList(r.followers || []);
            setLoadingList(false);
          }} className="text-left">
            <span className="text-[15px] font-semibold" style={{ color: ui.textPrimary }}>{profileData.followersCount ?? 0}</span>{' '}
            <span className="text-[13px]" style={{ color: ui.textMuted }}>followers</span>
          </button>
          <button onClick={async () => {
            const uid = viewingUserId || ui.currentUserId;
            if (!uid) return;
            setLoadingList(true);
            setShowFollowingList(true);
            const r = await doGetFollowing(uid);
            setFollowingList(r.following || []);
            setLoadingList(false);
          }} className="text-left">
            <span className="text-[15px] font-semibold" style={{ color: ui.textPrimary }}>{profileData.followingCount ?? 0}</span>{' '}
            <span className="text-[13px]" style={{ color: ui.textMuted }}>following</span>
          </button>
          <div><span className="text-[15px] font-semibold" style={{ color: ui.textPrimary }}>{displayPosts.length}</span> <span className="text-[13px]" style={{ color: ui.textMuted }}>posts</span></div>
        </div>

        {/* Stats cards */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard ui={ui} icon={Award} color={V.gold} label="Rep" value={profileData.reputation || 0} />
          <StatCard ui={ui} icon={Eye} color={V.electric} label="Score" value={avgScore} />
          <StatCard ui={ui} icon={VicoinIcon} color={V.gold} label="Coins" value={fmt(totalEarned)} raw />
        </div>

        {/* ── About Preview Card ── */}
        {hasAbout && (
          <button onClick={() => setShowAboutModal(true)} className="mt-4 w-full rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.99]" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] font-semibold" style={{ color: ui.textPrimary }}>About</span>
              <ChevronRight size={14} style={{ color: ui.textMuted }} />
            </div>
            <div className="space-y-1.5">
              {aboutData.location && <div className="flex items-center gap-1.5 text-[13px]" style={{ color: ui.textSecondary }}><MapPin size={12} />{aboutData.location}</div>}
              {aboutData.occupation && <div className="flex items-center gap-1.5 text-[13px]" style={{ color: ui.textSecondary }}><Briefcase size={12} />{aboutData.occupation}{aboutData.company ? ` at ${aboutData.company}` : ''}</div>}
              {aboutData.school && <div className="flex items-center gap-1.5 text-[13px]" style={{ color: ui.textSecondary }}><GraduationCap size={12} />{aboutData.school}</div>}
              {aboutData.website && <div className="flex items-center gap-1.5 text-[13px]" style={{ color: V.electric }}><Globe size={12} />{aboutData.website.replace(/^https?:\/\//, '')}</div>}
            </div>
          </button>
        )}

        {/* ── My Profile: Edit About or placeholder ── */}
        {displayIsOwn && !hasAbout && (
          <button onClick={() => setTab?.('settings')} className="mt-4 w-full rounded-2xl p-4 text-center transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.99]" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
            <span className="text-[13px] font-medium" style={{ color: ui.textMuted }}>Add your location, skills, and more in Settings → Account</span>
          </button>
        )}

        {/* ── ABOUT MODAL ── */}
        {showAboutModal && (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: ui.dark ? V.dark : '#FFFFFF' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${ui.border}` }}>
              <button onClick={() => setShowAboutModal(false)} className="p-1"><ArrowLeft size={20} style={{ color: ui.textPrimary }} /></button>
              <span className="text-[16px] font-semibold" style={{ color: ui.textPrimary }}>About</span>
              <div className="w-6" />
            </div>
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8 space-y-4">
              {aboutData.location && <div style={{ color: ui.textPrimary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} style={{ color: ui.textSecondary, flexShrink: 0 }} /> <span className="font-medium" style={{ color: ui.textPrimary }}>{aboutData.location}</span></div>}
              {aboutData.website && <div style={{ color: ui.textPrimary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={16} style={{ color: V.electric, flexShrink: 0 }} /> <a href={aboutData.website.startsWith('http') ? aboutData.website : `https://${aboutData.website}`} target="_blank" rel="noopener" className="font-medium" style={{ color: V.electric }}>{aboutData.website.replace(/^https?:\/\//, '')} <ExternalLink size={12} className="inline" /></a></div>}
              {aboutData.occupation && <div style={{ color: ui.textPrimary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase size={16} style={{ color: ui.textSecondary, flexShrink: 0 }} /> <span className="font-medium" style={{ color: ui.textPrimary }}>{aboutData.occupation}{aboutData.company ? ` at ${aboutData.company}` : ''}</span></div>}
              {aboutData.school && <div style={{ color: ui.textPrimary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><GraduationCap size={16} style={{ color: ui.textSecondary, flexShrink: 0 }} /> <span className="font-medium" style={{ color: ui.textPrimary }}>{aboutData.school}{aboutData.education ? ` · ${aboutData.education}` : ''}</span></div>}
              {aboutData.skills.length > 0 && (
                <div>
                  <div className="text-[13px] font-semibold mb-2" style={{ color: ui.textPrimary }}>Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {aboutData.skills.map((s, i) => (<span key={i} className="px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: `${V.royal}12`, color: V.royal, border: `1px solid ${V.royal}20` }}>{s}</span>))}
                  </div>
                </div>
              )}
              {aboutData.interests.length > 0 && (
                <div>
                  <div className="text-[13px] font-semibold mb-2" style={{ color: ui.textPrimary }}>Interests</div>
                  <div className="flex flex-wrap gap-2">
                    {aboutData.interests.map((s, i) => (<span key={i} className="px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: `${V.electric}12`, color: V.electric, border: `1px solid ${V.electric}20` }}>{s}</span>))}
                  </div>
                </div>
              )}
              {(aboutData.twitter || aboutData.instagram || aboutData.linkedin || aboutData.github || aboutData.tiktok || aboutData.youtube) && (
                <div>
                  <div className="text-[13px] font-semibold mb-2" style={{ color: ui.textPrimary }}>Social Links</div>
                  <div className="flex flex-wrap gap-3">
                    {aboutData.twitter && <a href={`https://x.com/${aboutData.twitter.replace(/^https?:\/\/(x\.com|twitter\.com)\/?/, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: `${V.royal}10`, color: ui.textPrimary, border: `1px solid ${ui.border}` }}><Twitter size={14} /> {aboutData.twitter.replace(/^https?:\/\/(x\.com|twitter\.com)\/?/, '')}</a>}
                    {aboutData.instagram && <a href={`https://instagram.com/${aboutData.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: `${V.royal}10`, color: ui.textPrimary, border: `1px solid ${ui.border}` }}><Instagram size={14} /> {aboutData.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, '')}</a>}
                    {aboutData.linkedin && <a href={`https://linkedin.com/in/${aboutData.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/(in\/)?/, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: `${V.royal}10`, color: ui.textPrimary, border: `1px solid ${ui.border}` }}><Linkedin size={14} /> {aboutData.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/(in\/)?/, '')}</a>}
                    {aboutData.github && <a href={`https://github.com/${aboutData.github.replace(/^https?:\/\/(www\.)?github\.com\/?/, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: `${V.royal}10`, color: ui.textPrimary, border: `1px solid ${ui.border}` }}><Github size={14} /> {aboutData.github.replace(/^https?:\/\/(www\.)?github\.com\/?/, '')}</a>}
                    {aboutData.tiktok && <a href={`https://tiktok.com/@${aboutData.tiktok.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: `${V.royal}10`, color: ui.textPrimary, border: `1px solid ${ui.border}` }}><Music size={14} /> {aboutData.tiktok.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, '')}</a>}
                    {aboutData.youtube && <a href={`https://youtube.com/@${aboutData.youtube.replace(/^https?:\/\/(www\.)?youtube\.com\/(@|c\/|channel\/)?/, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: `${V.royal}10`, color: ui.textPrimary, border: `1px solid ${ui.border}` }}><Youtube size={14} /> {aboutData.youtube.replace(/^https?:\/\/(www\.)?youtube\.com\/(@|c\/|channel\/)?/, '')}</a>}
                  </div>
                </div>
              )}
              {displayIsOwn && (
                <button onClick={() => { setShowAboutModal(false); setTab?.('settings'); }} className="mt-4 w-full h-[40px] rounded-full text-[12px] font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-95" style={{ background: ui.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,18,38,0.06)', color: ui.textPrimary, border: `1px solid ${ui.border}` }}>Edit About in Settings</button>
              )}
            </div>
          </div>
        )}

        {/* ── FOLLOWERS LIST MODAL ── */}
      </div>

      {/* ── FOLLOWERS LIST MODAL ── */}
      {showFollowersList && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: ui.dark ? V.dark : '#FFFFFF' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${ui.border}` }}>
            <button onClick={() => setShowFollowersList(false)} className="p-1">
              <ArrowLeft size={20} style={{ color: ui.textPrimary }} />
            </button>
            <span className="text-[16px] font-semibold" style={{ color: ui.textPrimary }}>Followers</span>
            <div className="w-6" />
          </div>
          <div className="flex-1 overflow-y-auto px-5 pt-2">
            {loadingList ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: ui.textMuted }} /></div>
            ) : followersList.length === 0 ? (
              <EmptyState ui={ui} icon={UserPlus} title="No followers yet" body="When someone follows this account, they'll appear here." />
            ) : (
              followersList.map((f, i) => (
                <div key={i} className="flex items-center gap-3 py-3" style={{ borderBottom: i < followersList.length - 1 ? `1px solid ${ui.border}` : 'none' }}>
                  <button onClick={() => { setShowFollowersList(false); onViewProfile?.(f.user_id); }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <Avatar handle={f.username} name={f.display_name} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold" style={{ color: ui.textPrimary }}>{f.display_name || f.username}</div>
                      <div className="text-[12px]" style={{ color: ui.textMuted }}>@{f.username}</div>
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── FOLLOWING LIST MODAL ── */}
      {showFollowingList && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: ui.dark ? V.dark : '#FFFFFF' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${ui.border}` }}>
            <button onClick={() => setShowFollowingList(false)} className="p-1">
              <ArrowLeft size={20} style={{ color: ui.textPrimary }} />
            </button>
            <span className="text-[16px] font-semibold" style={{ color: ui.textPrimary }}>Following</span>
            <div className="w-6" />
          </div>
          <div className="flex-1 overflow-y-auto px-5 pt-2">
            {loadingList ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: ui.textMuted }} /></div>
            ) : followingList.length === 0 ? (
              <EmptyState ui={ui} icon={UserPlus} title="Not following anyone" body="When this account follows someone, they'll appear here." />
            ) : (
              followingList.map((f, i) => (
                <div key={i} className="flex items-center gap-3 py-3" style={{ borderBottom: i < followingList.length - 1 ? `1px solid ${ui.border}` : 'none' }}>
                  <button onClick={() => { setShowFollowingList(false); onViewProfile?.(f.user_id); }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <Avatar handle={f.username} name={f.display_name} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold" style={{ color: ui.textPrimary }}>{f.display_name || f.username}</div>
                      <div className="text-[12px]" style={{ color: ui.textMuted }}>@{f.username}</div>
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stories row */}
      <div className="mt-5 px-5">
        <div className="flex items-center gap-2 mb-3">
          <Camera size={14} style={{ color: V.electric }} />
          <h3 className="text-[14px] font-semibold tracking-[-0.01em]" style={{ color: ui.textPrimary }}>Stories</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto v-scroll pb-1">
          {/* Add story circle — functional */}
          <button onClick={() => document.getElementById('vio-story-input')?.click()} className="shrink-0 flex flex-col items-center gap-1.5">
            <div className="w-[68px] h-[68px] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95" style={{ ...gradientStyle(140), boxShadow: `0 6px 20px -8px ${V.royal}50` }}>
              <Plus size={22} className="text-white" />
            </div>
            <span className="text-[11px] font-medium" style={{ color: ui.textSecondary }}>Add story</span>
          </button>
          <input id="vio-story-input" type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const up = await uploadFileLocally(file);
            if (up.success && up.url) {
              const stories = JSON.parse(localStorage.getItem('vio.stories') || '[]');
              stories.unshift({ id: 's-' + Date.now(), url: up.url, type: file.type.startsWith('video/') ? 'video' : 'image', created_at: new Date().toISOString() });
              localStorage.setItem('vio.stories', JSON.stringify(stories));
              window.location.reload();
            }
          }} />
          {/* Show existing stories OR empty circles */}
          {(() => {
            const existingStories = JSON.parse(typeof localStorage !== 'undefined' ? localStorage.getItem('vio.stories') || '[]' : '[]');
            if (existingStories.length > 0) {
              return existingStories.map((story, i) => (
                <button key={story.id || i} className="shrink-0 flex flex-col items-center gap-1.5">
                  <div className="w-[68px] h-[68px] rounded-full overflow-hidden ring-[3px] transition-all duration-300 hover:scale-105" style={{ ringColor: V.electric, boxShadow: `0 0 0 2px ${V.electric}55` }}>
                    {story.type === 'video' ? <video src={story.url} className="w-full h-full object-cover" /> : <img src={story.url} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: ui.textSecondary }}>My story</span>
                </button>
              ));
            }
            return [1,2,3,4].map(i => (
              <div key={i} className="shrink-0 flex flex-col items-center gap-1.5 opacity-40">
                <div className="w-[68px] h-[68px] rounded-full flex items-center justify-center" style={{ border: `2px dashed ${ui.border}`, background: ui.dark ? V.surfaceDark : '#FAFAF8' }}>
                  <Clock size={18} style={{ color: ui.textMuted }} />
                </div>
                <span className="text-[11px]" style={{ color: ui.textMuted }}>Soon</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-5 px-5">
        <div className="flex overflow-x-auto v-scroll" style={{ borderBottom: `1px solid ${ui.border}` }}>
          {tabs.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="relative shrink-0 px-4 py-3 flex items-center gap-1.5 transition-all duration-200" style={{ color: active ? (ui.dark ? '#DDD6FE' : V.royal) : ui.textMuted }}>
                <Icon size={14} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[13px] font-medium">{t.label}</span>
                {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] rounded-full" style={{ ...gradientStyle(90), animation: 'vTabIndicator 200ms ease-out' }} />}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {activeTab === 'posts' && (
            displayPosts.length === 0 ? (
              <EmptyState ui={ui} icon={Sparkle} title="No posts yet" body="Every post you publish appears here. Create something worth discovering." />
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {displayPosts.map((p, i) => (
                  <div key={p.id || i} className="relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]" style={{ aspectRatio: '1/1', background: ui.dark ? V.surfaceDark : '#F0F0F0' }}>
                    {safe(p.media_url) && safe(p.media_kind) === 'image'
                      ? <img src={p.media_url} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full flex items-center justify-center" style={gradientStyle(((i * 47) % 180) + 60)}><VioMark size={30} color="rgba(255,255,255,0.85)" /></div>}
                    <div className="absolute top-1.5 right-1.5"><Ring score={Number(p.visibility_score) || 0} size={22} stroke={2} dark /></div>
                  </div>
                ))}
              </div>
            )
          )}
          {activeTab === 'reels' && <EmptyState ui={ui} icon={Play} title="No reels" body="Short videos appear here. Share your creative process in motion." />}
          {activeTab === 'docs' && <EmptyState ui={ui} icon={FileText} title="No documents" body="Long-form writing, articles, and guides appear here." />}
          {activeTab === 'media' && <EmptyState ui={ui} icon={ImageIcon} title="No media" body="Photos and artwork appear in this gallery." />}
          {activeTab === 'saved' && <EmptyState ui={ui} icon={Bookmark} title="Nothing saved" body="Posts and reels you bookmark will appear here." />}
        </div>
      </div>
    </section>
  );
}

export default ProfileScreen;
