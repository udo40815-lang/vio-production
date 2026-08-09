import React, { useState, useEffect, useRef } from 'react';
import { V, safe, fmt, timeAgo, gradientStyle, softGradientStyle } from '../utils/design-system.js';

function LegalScreen({ ui, activePage }) {
  // Read stored sub-page from sessionStorage (for direct sidebar navigation)
  const storedPage = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('vio-legal-page') : null;
  const initPage = storedPage || activePage || 'tos';
  const [page, setPage] = useState(initPage);
  useEffect(() => {
    // Clear the stored preference after reading it once
    if (storedPage && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('vio-legal-page');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pages = [
    { id: 'tos', label: 'Terms of Service' },
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'guidelines', label: 'Community Guidelines' },
    { id: 'help', label: 'Help Centre' },
    { id: 'about', label: 'About Vio' },
  ];

  const content = {};
  content.tos = { title: 'Terms of Service', body: [
    'Welcome to Vio, a social platform designed for creators who believe their work should speak for itself. By creating an account on Vio or using any of our services, you agree to the terms outlined below. Please read them carefully before getting started.',
    'Your content belongs to you. Every post, photo, video, document, and piece of writing you publish on Vio remains your intellectual property. We do not claim any ownership over your work. By posting on Vio, you grant us a limited, non-exclusive license to display your content on the platform. This license ends when you delete your content or your account.',
    'You are responsible for what you share. Do not post content that you did not create or do not have permission to use. This includes copyrighted material, trademarked assets, and other people\'s work presented as your own. If you reference or build upon someone else\'s work, give them proper credit.',
    'Respect other creators. Harassment, threats, bullying, and targeted abuse have no place on Vio. We built this platform to lift creators up, not tear them down. Behaviour that crosses this line may result in content removal, temporary suspension, or permanent termination of your account.',
    'Do not attempt to manipulate the visibility system. Vio ranks content based on genuine quality signals. Coordinated efforts to artificially inflate scores, spam engagement, or game the system undermine what makes this platform fair. Accounts found doing so may be restricted.',
    'Vio may update these terms from time to time. When we do, we will notify you through the app or via the email address associated with your account. Continued use of the platform after changes take effect constitutes acceptance of the updated terms.',
    'If you have questions about these terms, you can reach us through the Help Centre in your settings. We\'re a small team, but we read every message.',
  ]};
  content.privacy = { title: 'Privacy Policy', body: [
    'At Vio, we believe privacy is not a luxury. It is a fundamental part of building trust with the people who use our platform. This policy explains what information we collect, how we use it, and the choices you have.',
    'We collect only what is necessary to provide Vio to you. This includes your account information, such as your name, handle, and email address, the content you choose to publish on the platform, and basic usage data that helps us understand how people use Vio so we can make it better.',
    'We do not sell your personal data. Not to advertisers, not to data brokers, not to anyone. Vio operates on a different model from most social platforms. Our goal is to build a sustainable business around creator tools and premium features, not around mining and monetising your personal information.',
    'Your content is visible to other Vio users according to your privacy settings. You control who can see your profile, your posts, and your activity. We do not share your private messages, drafts, or browsing activity with other users or third parties.',
    'We use industry-standard security measures to protect your data, including encryption in transit and at rest. However, no system is perfect, and we encourage you to use a strong, unique password for your Vio account and enable two-factor authentication when it becomes available.',
    'You can delete your account at any time through the Settings menu. When you do, we permanently remove your profile, posts, and associated data from our servers within 30 days. Some anonymised usage data may be retained for analytical purposes, but it cannot be linked back to you.',
    'If you are in a region covered by data protection laws like the GDPR, you have additional rights including the right to access, correct, or export your data. Contact us through the Help Centre and we\'ll process your request promptly.',
  ]};
  content.guidelines = { title: 'Community Guidelines', body: [
    'Vio exists to help creators share their best work and be discovered on merit. These guidelines describe the kind of community we want to build together. Every creator on Vio is expected to follow them.',
    'Be genuine. Use your real name or the identity you create under. Do not impersonate other creators, brands, or organisations. Your reputation on Vio is tied to who you are and what you make. Building trust starts with being honest about your identity.',
    'Post your own work. Vio is a portfolio, not a repost feed. Every post should represent something you created or contributed to meaningfully. If you are sharing something collaborative, credit everyone involved. If you are inspired by another creator, acknowledge them.',
    'Engage with care. Comments, messages, and interactions should reflect the same standard you would expect from others. Critique is welcome. Meanness is not. If someone asks you to stop engaging with them, respect that boundary.',
    'No hate speech, harassment, or discrimination. Content that attacks people based on race, ethnicity, nationality, religion, gender, sexual orientation, disability, or any other protected characteristic will be removed. Repeated violations will result in account suspension.',
    'No spam. Do not post repetitive content, mass-follow accounts to get follow-backs, or use automated tools to generate engagement. Vio is designed for human creativity, not bot farms.',
    'Report problems when you see them. If you encounter content or behaviour that violates these guidelines, use the Report function in the app. Every report is reviewed by our team. We take action quickly because community trust is the most valuable asset we have.',
    'These guidelines will evolve as our community grows. We will communicate changes clearly and give creators time to understand what is expected of them. If you are ever unsure whether something is appropriate, ask yourself: does this make Vio a better place for creators?',
  ]};
  content.help = { title: 'Help Centre', body: [
    'Welcome to the Vio Help Centre. Whether you are brand new to the platform or have been creating here for a while, we want to make sure you have the information you need.',
    'How does the visibility score work? Every post on Vio is assigned a Visibility Score, which determines where it appears in feeds and discovery. The score starts at a baseline and adjusts based on quality signals: how trusted creators engage with your work, the richness of your content, and how consistently you publish. It is not influenced by how many followers you have or how long you have been on the platform.',
    'What are Vicoins? Vicoins are Vio\'s in-platform currency. You earn them by publishing posts, receiving meaningful engagement from other creators, and contributing thoughtfully to the community. You can spend Vicoins to boost the visibility of specific posts, unlock premium tools, or participate in exclusive campaigns.',
    'How do I grow my audience? The best way to grow on Vio is to publish great work consistently. Because visibility is based on craft rather than follower count, every post gets a fair chance. Engage genuinely with other creators whose work you admire. Collaboration and community are the fastest paths to growth here.',
    'How do I report a problem? Use the Report button found on posts, profiles, and messages. Describe the issue clearly and our moderation team will review it. We typically respond within 48 hours.',
    'Can I delete my account? Yes. Go to Settings, scroll to the bottom, and select Delete Account. We will permanently remove your data within 30 days. If you change your mind during that period, contact us and we can restore your account.',
    'Still have questions? Reach out through the Help section in Settings or email our support team. We are a small group, but we read and respond to every message we receive.',
  ]};
  content.about = { title: 'About Vio', body: [
    'Vio is a social platform built on a simple belief: your work deserves to be seen, regardless of who you know or how many followers you already have. We started Vio because we looked at the existing social media landscape and saw the same pattern everywhere. A small group of already-famous creators dominates every feed, while talented newcomers struggle to break through no matter how good their work is.',
    'That system is not broken by accident. It is designed that way. Traditional social platforms optimise for engagement at all costs. Engagement is easier to generate from accounts that already have millions of followers. So the algorithm keeps showing you the same few creators while burying everyone else. Vio takes a different approach.',
    'On Vio, every post starts even. There is no advantage for having more followers. No legacy boost for being an early adopter. No invisible gatekeepers deciding what surfaces and what does not. Instead, posts are ranked by a Visibility Score that responds to genuine quality signals: the substance of your content, the trustworthiness of the creators who engage with it, and how consistently you deliver value to your audience.',
    'We also built a fair creator economy into the platform. Vicoins let creators earn simply by doing what they already do: making great work. You do not need sponsorship deals or ad revenue sharing to make a living on Vio. You just need to be good at what you do.',
    'Vio is built by a small, independent team. We are not a subsidiary of a larger company. We do not have venture capital pressure to grow at any cost. Our only obligation is to the creators who use this platform. Every decision we make comes back to one question: does this help creators be discovered on merit?',
    'Thank you for being here. Whether you publish daily or just browse for inspiration, you are part of what makes Vio different. We are excited to build this with you.',
  ]};

  const current = content[page];

  return (
    <section className="px-5 pt-5 pb-8">
      <div className="flex overflow-x-auto v-scroll gap-1.5 mb-5">
        {pages.map(p => (
          <button key={p.id} onClick={() => setPage(p.id)} className="shrink-0 h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-all duration-200" style={{ background: page === p.id ? (ui.dark ? 'rgba(124,58,237,0.14)' : 'rgba(124,58,237,0.08)') : 'transparent', color: page === p.id ? (ui.dark ? '#DDD6FE' : V.royal) : ui.textSecondary, border: page === p.id ? `1px solid ${V.electric}44` : `1px solid transparent` }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="rounded-3xl p-6" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] mb-5" style={{ color: ui.textPrimary }}>{current.title}</h2>
        <div className="text-[14px] leading-[1.75] space-y-4" style={{ color: ui.textSecondary }}>
          {Array.isArray(current.body) ? current.body.map((para, i) => (
            <p key={i}>{para}</p>
          )) : <p>{current.body}</p>}
        </div>
        <div className="mt-6 pt-5 text-[11px]" style={{ borderTop: `1px solid ${ui.border}`, color: ui.textMuted }}>Last updated: August 2026</div>
      </div>
    </section>
  );
}

/* =====================================================================
   BOTTOM NAV — v1.4 (5 tabs)
   ===================================================================== */

export default LegalScreen;
