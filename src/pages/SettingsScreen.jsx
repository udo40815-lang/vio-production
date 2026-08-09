import React, { useState } from 'react';
import { V, gradientStyle } from '../utils/design-system.js';
import { ArrowLeft, ChevronRight, User, LockKeyhole, Shield, Bell, Palette, Languages, Eye, Database, HelpCircle, Info, MapPin, Globe, Briefcase, Building, GraduationCap, BookOpen, X, Plus, Check } from 'lucide-react';
import { doUpdateProfile } from '../store/index.js';

/* =====================================================================
   ACCOUNT EDITOR (Settings → Account)
   ===================================================================== */
function AccountScreen({ ui, onBack }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [displayName, setDisplayName] = useState(ui.displayName || '');
  const [username, setUsername] = useState(ui.handle || '');
  const [bio, setBio] = useState(ui.bio || '');
  const [location, setLocation] = useState(ui.location || '');
  const [website, setWebsite] = useState(ui.website || '');
  const [occupation, setOccupation] = useState(ui.occupation || '');
  const [company, setCompany] = useState(ui.company || '');
  const [school, setSchool] = useState(ui.school || '');
  const [education, setEducation] = useState(ui.education || '');
  const [skills, setSkills] = useState(Array.isArray(ui.skills) ? [...ui.skills] : []);
  const [interests, setInterests] = useState(Array.isArray(ui.interests) ? [...ui.interests] : []);
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [twitter, setTwitter] = useState(ui.twitter || '');
  const [instagram, setInstagram] = useState(ui.instagram || '');
  const [linkedin, setLinkedin] = useState(ui.linkedin || '');
  const [github, setGithub] = useState(ui.github || '');
  const [tiktok, setTiktok] = useState(ui.tiktok || '');
  const [youtube, setYoutube] = useState(ui.youtube || '');

  const addSkill = (e) => {
    e?.preventDefault();
    const v = skillInput.trim();
    if (!v) return;
    setSkills(prev => prev.includes(v) ? prev : [...prev, v]);
    setSkillInput('');
  };

  const removeSkill = (val) => setSkills(prev => prev.filter(x => x !== val));

  const addInterest = (e) => {
    e?.preventDefault();
    const v = interestInput.trim();
    if (!v) return;
    setInterests(prev => prev.includes(v) ? prev : [...prev, v]);
    setInterestInput('');
  };

  const removeInterest = (val) => setInterests(prev => prev.filter(x => x !== val));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError('');
    const patch = {};
    if (displayName.trim()) patch.display_name = displayName.trim();
    if (username.trim()) patch.username = username.trim();
    patch.bio = bio.trim();
    patch.location = location.trim();
    patch.website = website.trim();
    patch.occupation = occupation.trim();
    patch.company = company.trim();
    patch.school = school.trim();
    patch.education = education.trim();
    patch.skills = skills.filter(Boolean);
    patch.interests = interests.filter(Boolean);
    patch.twitter = twitter.trim();
    patch.instagram = instagram.trim();
    patch.linkedin = linkedin.trim();
    patch.github = github.trim();
    patch.tiktok = tiktok.trim();
    patch.youtube = youtube.trim();
    const result = await doUpdateProfile(patch);
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setSaveError('');
      setTimeout(() => setSaved(false), 2000);
    } else {
      setSaveError(result.error || 'Failed to save. Please try again.');
    }
  };

  const handleEnterSkill = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  };

  const handleEnterInterest = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addInterest(); }
  };

  const inputStyle = {
    background: ui.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,18,38,0.03)',
    color: ui.textPrimary,
    border: `1px solid ${ui.border}`,
  };
  const labelStyle = { color: ui.textSecondary, fontSize: '13px', fontWeight: 600, marginBottom: '6px' };
  const sectionStyle = { color: ui.textPrimary, fontSize: '16px', fontWeight: 700, marginTop: '28px', marginBottom: '14px' };

  return (
    <section className="px-5 pt-5 pb-8">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-2 text-[14px] font-medium" style={{ color: ui.textSecondary }}>
          <ArrowLeft size={15} /> Back
        </button>
        <button onClick={handleSave} disabled={saving} className="h-[38px] px-5 rounded-full text-[12px] font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-40" style={{ ...gradientStyle(120) }}>
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
      {saveError && (
        <div className="mb-4 rounded-xl p-3 text-[13px] font-medium text-center" style={{ background: '#EF444420', color: '#EF4444', border: '1px solid #EF444433' }}>
          {saveError}
        </div>
      )}

      {/* Basic Info */}
      <div style={sectionStyle}>Basic Information</div>
      <div className="space-y-4">
        <div><div style={labelStyle}>Full Name</div><input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} /></div>
        <div><div style={labelStyle}>Username</div><input value={username} onChange={e => setUsername(e.target.value)} placeholder="yourname" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} /></div>
        <div><div style={labelStyle}>Bio</div><textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A short bio about yourself" rows={3} className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED] resize-none" style={inputStyle} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><div style={labelStyle}><MapPin size={12} className="inline mr-1" />Location</div><input value={location} onChange={e => setLocation(e.target.value)} placeholder="City or country" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} /></div>
          <div><div style={labelStyle}><Globe size={12} className="inline mr-1" />Website</div><input value={website} onChange={e => setWebsite(e.target.value)} placeholder="yourdomain.com" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} /></div>
        </div>
      </div>

      {/* Professional */}
      <div style={sectionStyle}>Professional</div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><div style={labelStyle}><Briefcase size={12} className="inline mr-1" />Occupation</div><input value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Product Designer" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} /></div>
          <div><div style={labelStyle}><Building size={12} className="inline mr-1" />Company</div><input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><div style={labelStyle}><GraduationCap size={12} className="inline mr-1" />School</div><input value={school} onChange={e => setSchool(e.target.value)} placeholder="University of Lagos" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} /></div>
          <div><div style={labelStyle}><BookOpen size={12} className="inline mr-1" />Education</div><input value={education} onChange={e => setEducation(e.target.value)} placeholder="B.Sc. Computer Science" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} /></div>
        </div>
      </div>

      {/* Skills */}
      <div style={sectionStyle}>Skills</div>
      <div className="flex gap-2">
        <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={handleEnterSkill} placeholder="Add a skill" className="flex-1 rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} />
        <button onClick={(e) => addSkill(e)} type="button" className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer" style={{ background: `${V.royal}15`, color: V.royal }}><Plus size={18} /></button>
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {skills.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: `${V.royal}12`, color: V.royal, border: `1px solid ${V.royal}20` }}>
              {s}
              <button type="button" onClick={(e) => { e.stopPropagation(); removeSkill(s); }} className="hover:opacity-60 cursor-pointer" style={{ lineHeight: 1 }}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Interests */}
      <div style={sectionStyle}>Interests</div>
      <div className="flex gap-2">
        <input value={interestInput} onChange={e => setInterestInput(e.target.value)} onKeyDown={handleEnterInterest} placeholder="Add an interest" className="flex-1 rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} />
        <button onClick={(e) => addInterest(e)} type="button" className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer" style={{ background: `${V.electric}15`, color: V.electric }}><Plus size={18} /></button>
      </div>
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {interests.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: `${V.electric}12`, color: V.electric, border: `1px solid ${V.electric}20` }}>
              {s}
              <button type="button" onClick={(e) => { e.stopPropagation(); removeInterest(s); }} className="hover:opacity-60 cursor-pointer" style={{ lineHeight: 1 }}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Social Links */}
      <div style={sectionStyle}>Social Links</div>
      <div className="space-y-3">
        {[
          { label: 'X (Twitter)', field: twitter, set: setTwitter, placeholder: 'username or URL' },
          { label: 'Instagram', field: instagram, set: setInstagram, placeholder: 'username or URL' },
          { label: 'LinkedIn', field: linkedin, set: setLinkedin, placeholder: 'username or URL' },
          { label: 'GitHub', field: github, set: setGithub, placeholder: 'username or URL' },
          { label: 'TikTok', field: tiktok, set: setTiktok, placeholder: 'username or URL' },
          { label: 'YouTube', field: youtube, set: setYoutube, placeholder: 'username or URL' },
        ].map(social => (
          <div key={social.label}><div style={labelStyle}>{social.label}</div><input value={social.field} onChange={e => social.set(e.target.value)} placeholder={social.placeholder} className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-[#7C3AED]" style={inputStyle} /></div>
        ))}
      </div>

      <div className="mt-10" />
    </section>
  );
}

/* =====================================================================
   SETTINGS SCREEN
   ===================================================================== */
function SettingsScreen({ ui, setDark, setTab }) {
  const [page, setPage] = useState('main');
  const settingsSections = [
    { id: 'account', icon: User, label: 'Account', description: 'Name, username, bio, and professional details' },
    { id: 'privacy', icon: LockKeyhole, label: 'Privacy', description: 'Who can see your content and interact with you' },
    { id: 'security', icon: Shield, label: 'Security', description: 'Two-factor authentication and login activity' },
    { id: 'notifications', icon: Bell, label: 'Notifications', description: 'Email, push, and in-app notification preferences' },
    { id: 'appearance', icon: Palette, label: 'Appearance', description: 'Dark mode, light mode, and font size' },
    { id: 'language', icon: Languages, label: 'Language', description: 'Change the app language' },
    { id: 'accessibility', icon: Eye, label: 'Accessibility', description: 'Screen reader, contrast, and motion settings' },
    { id: 'storage', icon: Database, label: 'Storage & data', description: 'Cache, downloads, and data usage' },
    { id: 'help', icon: HelpCircle, label: 'Help', description: 'FAQs, contact support, and documentation' },
    { id: 'about', icon: Info, label: 'About Vio', description: 'Version 1.4' },
  ];

  if (page === 'account') {
    return <AccountScreen ui={ui} onBack={() => setPage('main')} />;
  }

  if (page !== 'main') {
    const section = settingsSections.find(s => s.id === page);
    return (
      <section className="px-5 pt-5 pb-8">
        <button onClick={() => setPage('main')} className="flex items-center gap-2 mb-5 text-[14px] font-medium" style={{ color: ui.textSecondary }}><ArrowLeft size={15} /> Back</button>
        <div className="rounded-3xl p-8 text-center" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: `${V.royal}15` }}>
            {section && React.createElement(section.icon, { size: 22, style: { color: V.royal } })}
          </div>
          <h2 className="mt-4 text-[18px] font-semibold" style={{ color: ui.textPrimary }}>{section ? section.label : page}</h2>
          <p className="mt-2 text-[14px] leading-relaxed max-w-xs mx-auto" style={{ color: ui.textSecondary }}>This section will be available when the backend is integrated. All settings will be fully customisable.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 pt-5 pb-8">
      <div className="rounded-2xl p-4 flex items-center justify-between mb-5" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${V.gold}15` }}><Palette size={17} style={{ color: V.gold }} /></div>
          <div><div className="text-[14px] font-semibold" style={{ color: ui.textPrimary }}>Appearance</div><div className="text-[12px]" style={{ color: ui.textMuted }}>{ui.dark ? 'Dark mode' : 'Light mode'}</div></div>
        </div>
        <button onClick={() => setDark(!ui.dark)} className="w-[52px] h-[30px] rounded-full relative transition-all duration-300" style={{ background: ui.dark ? V.electric : '#D1D5DB' }}>
          <div className="absolute top-[3px] w-[24px] h-[24px] rounded-full bg-white shadow transition-all duration-300" style={{ left: ui.dark ? '25px' : '3px' }} />
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
        {settingsSections.map((s, i) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setPage(s.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-black/[0.02]" style={{ borderTop: i > 0 ? `1px solid ${ui.border}` : 'none' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${V.royal}12` }}><Icon size={15} style={{ color: V.royal }} /></div>
              <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold" style={{ color: ui.textPrimary }}>{s.label}</div><div className="text-[11.5px] mt-0.5" style={{ color: ui.textMuted }}>{s.description}</div></div>
              <ChevronRight size={14} style={{ color: ui.textMuted }} />
            </button>
          );
        })}
      </div>
      <div className="mt-5 text-center text-[11px]" style={{ color: ui.textMuted }}>Vio v1.4</div>
    </section>
  );
}

export default SettingsScreen;
