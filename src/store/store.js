// ============================================================================
// Vio v1.5 — Store (Supabase Backend — Posts)
// Supabase Auth + PostgreSQL + Posts table.
// Posts are now fully server-side with real-time support.
// ============================================================================

import { useSyncExternalStore, useMemo } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  signUp as supabaseSignUp,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  sendPasswordReset as supabaseSendReset,
  getSession as getCurrentSession,
  onAuthStateChange,
} from '../lib/auth.js';
import { getMyProfile, updateProfile, searchProfiles, getProfileById } from '../lib/profile.js';
import { uploadFile } from '../lib/storage.js';
import {
  createPost as supabaseCreatePost,
  getFeed as supabaseGetFeed,
  getUserPosts,
  updatePost as supabaseUpdatePost,
  deletePost as supabaseDeletePost,
  subscribeToPosts,
  searchPosts,
} from '../lib/posts.js';
import { toggleLike, toggleReaction, getMyReactions, getReactionCounts, getLikeCount, getPostLikers, subscribeToLikes } from '../lib/reactions.js';
import { addComment, getPostComments, deleteComment } from '../lib/comments.js';
import { toggleFollow, isFollowing, getFollowerCount, getFollowingCount, getFollowers, getFollowing } from '../lib/follows.js';
import { toggleSave, getSavedPosts, getMySavedIds } from '../lib/saves.js';
import { getNotifications, markAsRead, markAllAsRead, clearNotifications, subscribeToNotifications, createNotification } from '../lib/notifications.js';
import { getBalance, earnVicoins, spendVicoins, getTransactionHistory, hasEarnedReward } from '../lib/vicoins.js';
import { computeVisibility, getVisibilityBreakdown, updateReputation } from '../lib/visibility.js';
import { boostPost, getMyBoosts } from '../lib/boosts.js';
import { submitReport, getMyReports } from '../lib/reports.js';
import { requestVerification, getVerificationStatus } from '../lib/verification.js';
import { toggleBlock, checkBlockStatus, getBlockList } from '../lib/blocks.js';
import { browseServices, getUserServices, createService, upsertBusinessProfile, getBusinessProfile } from '../lib/marketplace.js';
import { createInvoice, getPaymentHistory } from '../lib/payments.js';
import { recordEvent, getAnalyticsSummary, getTopPosts, getDailyAnalytics } from '../lib/analytics.js';
import { createCollection, getCollections, deleteCollection } from '../lib/collections.js';

// ---------------------------------------------------------------------------
// Reactive pub/sub store
// ---------------------------------------------------------------------------
const listeners = new Set();
const emit = () => { for (const l of listeners) l(); version++; };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

let version = 0;
function getSnapshot() { return version; }

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
let session = null;     // Supabase Auth session
let currentUser = null;  // Supabase user object (has .id)
let profile = null;     // Profile row from public.profiles
let initialized = false;
let loading = false;

// Posts now come from Supabase
let localPosts = [];
let localLedger = [];
let localNotifications = [];
let localSavedPosts = [];
let localTransactions = [];
let localBoosts = [];
let localVisibility = null;
let localLikedIds = {};        // postId -> boolean (for legacy)
let localMyReactions = {};      // postId -> reactionType
let localReactionCounts = {};   // postId -> { total, top3, countsByType }
let unreadCount = 0;

// Theme default
let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// Real-time subscription cleanup
let postsUnsubscribe = null;
let notifUnsubscribe = null;

// ---------------------------------------------------------------------------
// Public getters (backwards-compatible with old store)
// ---------------------------------------------------------------------------
function getSessionObj() {
  return {
    authenticated: !!session,
    handle: profile?.username || '',
    userId: currentUser?.id || '',
    theme,
  };
}

function getProfileObj() {
  if (!profile) return { handle: '', name: '', displayName: '', bio: '', reputation: 0, joined: '', avatarUrl: '', coverUrl: '', website: '', location: '', followersCount: 0, followingCount: 0, occupation: '', company: '', school: '', education: '', skills: [], interests: [], twitter: '', instagram: '', linkedin: '', github: '', tiktok: '', youtube: '' };
  return {
    handle: profile.username || '',
    name: profile.display_name || '',
    displayName: profile.display_name || '',
    bio: profile.bio || '',
    reputation: profile.reputation || 0,
    joined: profile.joined_date || '',
    avatarUrl: profile.avatar_url || '',
    coverUrl: profile.cover_url || '',
    website: profile.website || '',
    location: profile.location || '',
    followersCount: profile.followers_count || 0,
    followingCount: profile.following_count || 0,
    occupation: profile.occupation || '',
    company: profile.company || '',
    school: profile.school || '',
    education: profile.education || '',
    skills: profile.skills || [],
    interests: profile.interests || [],
    twitter: profile.twitter || '',
    instagram: profile.instagram || '',
    linkedin: profile.linkedin || '',
    github: profile.github || '',
    tiktok: profile.tiktok || '',
    youtube: profile.youtube || '',
  };
}

function getPosts() { return localPosts; }
function getLedger() { return localLedger; }

// ---------------------------------------------------------------------------
// Posts — Supabase-backed
// ---------------------------------------------------------------------------

/**
 * Load the feed from Supabase.
 */
export async function loadFeed() {
  const { posts, error } = await supabaseGetFeed({ limit: 50 });
  if (!error) {
    localPosts = posts;
    emit();
  }
  return { posts, error };
}

/**
 * Create a post via Supabase (with optional media upload).
 * @param {object} postData
 * @param {string} postData.content
 * @param {File}   [postData.mediaFile]
 * @param {string} [postData.mediaKind]
 * @returns {{ success: boolean, post: object|null, error: string|null }}
 */
export async function doCreatePost({ content, mediaFile, mediaKind } = {}) {
  const { post, error } = await supabaseCreatePost({ content, mediaFile, mediaKind });
  if (post) {
    localPosts.unshift(post);
    // Award Vicoins for publishing
    addLedgerEntry({
      id: 'vc-' + Date.now(),
      kind: 'earn',
      amount: 5,
      reason: 'Published a post',
      source: 'post',
      ref_post_id: post.id,
      created_at: new Date().toISOString(),
    });
    emit();
  }
  return {
    success: !!post,
    post,
    error: error?.message || null,
  };
}

/**
 * Delete a post.
 * @param {string} id
 * @returns {{ success: boolean, error: string|null }}
 */
export async function doDeletePost(id) {
  const { error } = await supabaseDeletePost(id);
  if (!error) {
    localPosts = localPosts.filter(p => p.id !== id);
    emit();
  }
  return { success: !error, error: error?.message || null };
}

/**
 * Legacy addPost — calls doCreatePost for backward-compat.
 */
export function addPost(postData) {
  doCreatePost(postData);
  return postData; // optimistic return
}

/**
 * Update a post locally (optimistic) + remote.
 */
export async function doUpdatePost(id, patch) {
  // Optimistic update
  localPosts = localPosts.map(p => p.id === id ? { ...p, ...patch } : p);
  emit();

  // Sync to server
  const { error } = await supabaseUpdatePost(id, patch);
  if (error) {
    console.warn('Failed to sync post update:', error.message);
  }
}

// Legacy updatePost
export function updatePost(id, patch) {
  doUpdatePost(id, patch);
}

// ---------------------------------------------------------------------------
// Search — Supabase-backed
// ---------------------------------------------------------------------------

/**
 * Search profiles and posts by query string.
 * @param {string} query
 * @returns {{ profiles: [], posts: [], error }}
 */
export async function doGetProfileById(userId) {
  const { profile, error } = await getProfileById(userId);
  return { profile, error };
}

export async function doGetPostsByUserId(userId) {
  const { posts, error } = await getUserPosts(userId);
  return { posts, error };
}

export async function doGetPostsByUsername(username) {
  const { posts, error } = await getPostsByUsername(username);
  return { posts, error };
}

export async function doSearch(query) {
  const [profileResult, postResult] = await Promise.all([
    searchProfiles(query, { limit: 10 }),
    searchPosts(query, { limit: 10 }),
  ]);

  return {
    profiles: profileResult.profiles || [],
    posts: postResult.posts || [],
    error: profileResult.error || postResult.error || null,
  };
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------
export async function doLikePost(postId) {
  const oldReaction = localMyReactions[postId] || null;
  const oldCounts = localReactionCounts[postId] || { total: 0, top3: [], countsByType: {} };
  const oldTotal = oldCounts.total;

  // Optimistic: toggle like
  if (oldReaction === 'like') {
    delete localMyReactions[postId];
    localReactionCounts[postId] = {
      ...oldCounts,
      total: Math.max(0, oldTotal - 1),
      countsByType: { ...(oldCounts.countsByType || {}), like: Math.max(0, (oldCounts.countsByType?.like || 0) - 1) },
      top3: [],
    };
  } else {
    // If switching from love to like, remove love from counts
    if (oldReaction === 'love') {
      localReactionCounts[postId] = {
        ...oldCounts,
        countsByType: { ...(oldCounts.countsByType || {}), love: Math.max(0, (oldCounts.countsByType?.love || 0) - 1), like: (oldCounts.countsByType?.like || 0) + 1 },
        top3: [],
      };
    } else {
      localReactionCounts[postId] = {
        ...oldCounts,
        total: oldTotal + 1,
        countsByType: { ...(oldCounts.countsByType || {}), like: (oldCounts.countsByType?.like || 0) + 1 },
        top3: [],
      };
    }
    localMyReactions[postId] = 'like';
  }
  emit();

  const result = await toggleLike(postId);
  if (result.error) {
    // Rollback
    localMyReactions[postId] = oldReaction || undefined;
    localReactionCounts[postId] = oldCounts;
    emit();
    return result;
  }
  const { counts: freshCounts } = await getReactionCounts([postId]);
  if (freshCounts[postId]) localReactionCounts[postId] = freshCounts[postId];
  else localReactionCounts[postId] = { total: 0, top3: [], countsByType: {} };
  emit();
  return { ...result, count: freshCounts[postId]?.total || 0 };
}

export async function doReact(postId, reaction) {
  const oldReaction = localMyReactions[postId] || null;
  const oldCounts = localReactionCounts[postId] || { total: 0, top3: [], countsByType: {} };
  const oldTotal = oldCounts.total;

  // Optimistic
  if (oldReaction === reaction) {
    // Same reaction → remove
    delete localMyReactions[postId];
    localReactionCounts[postId] = {
      ...oldCounts,
      total: Math.max(0, oldTotal - 1),
      countsByType: { ...(oldCounts.countsByType || {}), [reaction]: Math.max(0, (oldCounts.countsByType?.[reaction] || 0) - 1) },
      top3: [],
    };
  } else if (oldReaction) {
    // Different reaction → replace (total unchanged, swap counts)
    localMyReactions[postId] = reaction;
    localReactionCounts[postId] = {
      ...oldCounts,
      countsByType: {
        ...(oldCounts.countsByType || {}),
        [oldReaction]: Math.max(0, (oldCounts.countsByType?.[oldReaction] || 0) - 1),
        [reaction]: (oldCounts.countsByType?.[reaction] || 0) + 1,
      },
      top3: [],
    };
  } else {
    // New reaction
    localMyReactions[postId] = reaction;
    localReactionCounts[postId] = {
      ...oldCounts,
      total: oldTotal + 1,
      countsByType: { ...(oldCounts.countsByType || {}), [reaction]: (oldCounts.countsByType?.[reaction] || 0) + 1 },
      top3: [],
    };
  }
  emit();

  const result = await toggleReaction(postId, reaction);
  if (result.error) {
    // Rollback
    if (oldReaction) localMyReactions[postId] = oldReaction;
    else delete localMyReactions[postId];
    localReactionCounts[postId] = oldCounts;
    emit();
    return result;
  }
  const { counts: freshCounts } = await getReactionCounts([postId]);
  if (freshCounts[postId]) localReactionCounts[postId] = freshCounts[postId];
  else localReactionCounts[postId] = { total: 0, top3: [], countsByType: {} };
  emit();
  return { ...result, count: freshCounts[postId]?.total || 0 };
}

export async function doLoadLikes(postIds) {
  if (!postIds.length) return;
  const [{ reactions: myReactions }, { counts }] = await Promise.all([
    getMyReactions(postIds),
    getReactionCounts(postIds),
  ]);
  localMyReactions = myReactions;
  localReactionCounts = counts;
  emit();
}

export async function doGetPostLikers(postId) {
  return await getPostLikers(postId);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function doAddComment(postId, content, parentId = null) {
  const result = await addComment(postId, content, parentId);
  // Refresh comments for this post (simplified — full refresh in UI)
  emit();
  return result;
}

export async function doDeleteComment(commentId, postId) {
  const result = await deleteComment(commentId, postId);
  emit();
  return result;
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export async function doToggleFollow(userId) {
  const result = await toggleFollow(userId);
  emit();
  return result;
}

export async function doCheckFollow(userId) {
  return await isFollowing(userId);
}

export async function doGetFollowers(userId) {
  return await getFollowers(userId);
}

export async function doGetFollowing(userId) {
  return await getFollowing(userId);
}

// ---------------------------------------------------------------------------
// Saved Posts
// ---------------------------------------------------------------------------

export async function doToggleSave(postId) {
  const result = await toggleSave(postId);
  if (!result.error) {
    // Sync localSavedPosts with DB state
    const { savedIds } = await getMySavedIds();
    localSavedPosts = savedIds;
  }
  emit();
  return result;
}

export async function doLoadSavedPosts() {
  const result = await getSavedPosts();
  localSavedPosts = (result.posts || []).map(p => p.id);
  emit();
  return result;
}

export async function doLoadSavedIds() {
  const { savedIds } = await getMySavedIds();
  localSavedPosts = savedIds;
  emit();
  return savedIds;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function doCreateNotification(params) {
  return await createNotification(params);
}

export async function doLoadNotifications() {
  const result = await getNotifications();
  localNotifications = result.notifications;
  emit();
  return result;
}

export async function doMarkAsRead(id) {
  await markAsRead(id);
  localNotifications = localNotifications.map(n =>
    n.id === id ? { ...n, read: true } : n
  );
  unreadCount = Math.max(0, unreadCount - 1);
  emit();
}

export async function doMarkAllAsRead() {
  await markAllAsRead();
  localNotifications = localNotifications.map(n => ({ ...n, read: true }));
  unreadCount = 0;
  emit();
}

export async function doClearNotifications() {
  await clearNotifications();
  localNotifications = [];
  unreadCount = 0;
  emit();
}

function getNotificationsList() { return localNotifications; }
function getSavedPostsList() { return localSavedPosts || []; }
function getTransactionsList() { return localTransactions; }
function getBoostsList() { return localBoosts; }
function getVisibility() { return localVisibility; }
function getUnreadCount() { return unreadCount; }

// ---------------------------------------------------------------------------
// Vicoins
// ---------------------------------------------------------------------------

export async function doRefreshBalance() {
  const { balance, error } = await getBalance();
  if (profile) profile.vicoin_balance = balance;
  emit();
  return balance;
}

export async function doLoadTransactionHistory() {
  const { transactions, error } = await getTransactionHistory();
  localTransactions = transactions;
  emit();
  return transactions;
}

export async function doEarnVicoins(amount, category, description, refPostId) {
  // Check for duplicate rewards
  if (category !== 'boost' && category !== 'engagement') {
    const alreadyEarned = await hasEarnedReward(category);
    if (alreadyEarned) return { newBalance: profile?.vicoin_balance || 0, error: null };
  }

  const { newBalance, error } = await earnVicoins(amount, category, description, refPostId);
  if (profile) profile.vicoin_balance = newBalance;
  emit();
  return { newBalance, error };
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

export async function doComputeVisibility() {
  const { score, error } = await computeVisibility();
  if (profile) profile.visibility_score = score;
  emit();
  return { score, error };
}

export async function doGetVisibilityBreakdown() {
  const result = await getVisibilityBreakdown();
  localVisibility = result;
  emit();
  return result;
}

export async function doUpdateReputation(delta) {
  const { newReputation, error } = await updateReputation(delta);
  if (profile) profile.reputation = newReputation;
  emit();
  return { newReputation, error };
}

// ---------------------------------------------------------------------------
// Boosts
// ---------------------------------------------------------------------------

export async function doBoostPost(postId, tier) {
  const { boost, error } = await boostPost(postId, tier);
  if (boost) {
    localBoosts.unshift(boost);
    doRefreshBalance();
  }
  emit();
  return { boost, error };
}

export async function doLoadMyBoosts() {
  const { boosts, error } = await getMyBoosts();
  localBoosts = boosts;
  emit();
  return boosts;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function doSubmitReport(targetType, targetId, reason, details) {
  const { report, error } = await submitReport(targetType, targetId, reason, details);
  return { report, error: error?.message || null };
}

export async function doGetMyReports() {
  const { reports, error } = await getMyReports();
  return { reports, error };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export async function doRequestVerification(level, details) {
  const { request, error } = await requestVerification(level, details);
  return { request, error: error?.message || null };
}

export async function doGetVerificationStatus() {
  const { status, level } = await getVerificationStatus();
  if (profile) profile.verification_status = status;
  if (profile) profile.verification_level = level;
  emit();
  return { status, level };
}

// ---------------------------------------------------------------------------
// Blocks & Mutes
// ---------------------------------------------------------------------------

export async function doToggleBlock(userId, kind = 'block') {
  const result = await toggleBlock(userId, kind);
  emit();
  return result;
}

export async function doCheckBlockStatus(userId) {
  return await checkBlockStatus(userId);
}

export async function doGetBlockList() {
  return await getBlockList();
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

export async function doBrowseServices(category) {
  return await browseServices({ category });
}

export async function doCreateService(data) {
  const { service, error } = await createService(data);
  emit();
  return { service, error: error?.message || null };
}

export async function doGetUserServices(userId) {
  return await getUserServices(userId);
}

export async function doUpsertBusinessProfile(data) {
  const { profile, error } = await upsertBusinessProfile(data);
  emit();
  return { profile, error: error?.message || null };
}

export async function doGetBusinessProfile(userId) {
  return await getBusinessProfile(userId);
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function doCreateInvoice(amount, kind, description) {
  return await createInvoice(amount, kind, description);
}

export async function doGetPaymentHistory() {
  return await getPaymentHistory();
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function doGetAnalyticsSummary() {
  return await getAnalyticsSummary();
}

export async function doGetTopPosts(limit) {
  return await getTopPosts(limit);
}

export async function doGetDailyAnalytics(days) {
  return await getDailyAnalytics(days);
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export async function doCreateCollection(name, desc, icon) {
  return await createCollection(name, desc, icon);
}

export async function doGetCollections() {
  return await getCollections();
}

export async function doDeleteCollection(id) {
  return await deleteCollection(id);
}

// ---------------------------------------------------------------------------
// Ledger (still client-side for now)
// ---------------------------------------------------------------------------
export function addLedgerEntry(entry) {
  localLedger.unshift(entry);
  emit();
  return entry;
}

// ---------------------------------------------------------------------------
// Actions (exported)
// ---------------------------------------------------------------------------

export function setSession(patch) {
  if (patch.theme !== undefined) theme = patch.theme;
  if (patch.authenticated !== undefined) { /* handled by Supabase */ }
  if (patch.handle !== undefined && profile) profile.username = patch.handle;
  emit();
}

export function setProfile(patch) {
  if (!profile) return;
  if (patch.name !== undefined) profile.display_name = patch.name;
  if (patch.bio !== undefined) profile.bio = patch.bio;
  if (patch.website !== undefined) profile.website = patch.website;
  if (patch.location !== undefined) profile.location = patch.location;
  if (patch.avatarUrl !== undefined) profile.avatar_url = patch.avatarUrl;
  if (patch.coverUrl !== undefined) profile.cover_url = patch.coverUrl;
  emit();
}

export function signOut() {
  supabaseSignOut();
  session = null;
  profile = null;
  localPosts = [];
  localLedger = [];
  if (postsUnsubscribe) { postsUnsubscribe(); postsUnsubscribe = null; }
  emit();
}

// Legacy file upload (base64 — STILL used by Create screen for post media)
export function uploadFileLocally(file) {
  return new Promise((resolve) => {
    if (!file) return resolve({ success: false, error: 'No file' });
    const reader = new FileReader();
    reader.onload = () => resolve({ success: true, url: reader.result });
    reader.onerror = () => resolve({ success: false, error: 'Failed to read file' });
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Session init (called once on app mount by App.jsx)
// ---------------------------------------------------------------------------
export async function initSession() {
  loading = true;
  initialized = false;
  emit();

  try {
    const s = await getCurrentSession();
    if (s) {
      session = s;
      currentUser = s.user || null;
      try {
        const { profile: p } = await getMyProfile();
        profile = p;
      } catch (profileErr) {
        console.error('[Vio] Failed to load profile during init:', profileErr);
      }
      // Load feed for authenticated user
      try {
        loadFeed();
      } catch (feedErr) {
        console.error('[Vio] Failed to load feed during init:', feedErr);
      }
    }
  } catch (err) {
    console.error('[Vio] Session init failed:', err);
    // Continue — app remains usable in unauthenticated state
  }

  loading = false;
  initialized = true;
  emit();

  // Listen for auth changes (sign out from another tab, etc.)
  try {
    onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_OUT') {
        session = null;
        currentUser = null;
        profile = null;
        localPosts = [];
        localLedger = [];
        if (postsUnsubscribe) { postsUnsubscribe(); postsUnsubscribe = null; }
        if (notifUnsubscribe) { notifUnsubscribe(); notifUnsubscribe = null; }
        emit();
      } else if (event === 'SIGNED_IN' && newSession) {
        session = newSession;
        getMyProfile().then(({ profile: p }) => { profile = p; emit(); }).catch(e => console.error('[Vio] Auth state change profile load failed:', e));
        loadFeed();
      } else if (event === 'TOKEN_REFRESHED' && newSession) {
        session = newSession;
        emit();
      }
    });

    // Subscribe to real-time post changes
    postsUnsubscribe = subscribeToPosts((payload) => {
      const { eventType, new: newPost, old: oldPost } = payload;

      switch (eventType) {
        case 'INSERT':
          localPosts = [newPost, ...localPosts];
          break;
        case 'UPDATE':
          localPosts = localPosts.map(p => p.id === newPost.id ? { ...p, ...newPost } : p);
          break;
        case 'DELETE':
          localPosts = localPosts.filter(p => p.id !== (oldPost?.id || oldPost));
          break;
        default:
          break;
      }
      emit();
    });

    // Subscribe to real-time notifications
    notifUnsubscribe = subscribeToNotifications(async (payload) => {
      localNotifications = [payload.new, ...localNotifications];
      unreadCount++;
      emit();
    });
  } catch (subErr) {
    console.error('[Vio] Failed to set up real-time subscriptions:', subErr);
  }
}

// ---------------------------------------------------------------------------
// Auth actions (used by AuthScreen)
// ---------------------------------------------------------------------------
export async function doSignUp({ email, password, displayName, username }) {
  const { data, error } = await supabaseSignUp(email, password, { display_name: displayName, username });
  if (data?.user && data?.session) {
    session = data.session;
    currentUser = data.user;
    const { profile: p } = await getMyProfile();
    profile = p;
  }
  const needsEmailConfirmation = !!(data?.user && !data?.session);
  emit();
  return {
    success: !error,
    error: error?.message || null,
    needsEmailConfirmation,
  };
}

export async function doSignIn({ email, password }) {
  const { data, error } = await supabaseSignIn(email, password);
  if (data?.session) {
    session = data.session;
    currentUser = data.user || null;
    const { profile: p } = await getMyProfile();
    profile = p;
    // Load feed on sign in
    loadFeed();
  }
  emit();
  return {
    success: !error,
    error: error?.message || null,
    handle: profile?.username || '',
    name: profile?.display_name || '',
  };
}

export async function doForgotPassword(email) {
  const { error } = await supabaseSendReset(email);
  return { success: !error, error: error?.message || null };
}

export async function doSignOut() {
  await supabaseSignOut();
  session = null;
  currentUser = null;
  profile = null;
  localPosts = [];
  localLedger = [];
  if (postsUnsubscribe) { postsUnsubscribe(); postsUnsubscribe = null; }
  emit();
}

// ---------------------------------------------------------------------------
// Profile actions (used by ProfileScreen)
// ---------------------------------------------------------------------------
export async function doUpdateProfile(patch) {
  const result = await updateProfile(patch);
  if (result.error) {
    return { success: false, error: result.error?.message || 'Failed to save' };
  }
  // Re-fetch the full profile from DB to get all fields
  const { profile: fresh } = await getMyProfile();
  if (fresh) {
    profile = fresh;
  }
  emit();
  return { success: true, error: null };
}

export async function doUploadAvatar(file) {
  if (!file) return { success: false, error: 'No file' };
  const result = await uploadFile({ file, bucket: 'avatars' });
  if (result.url) {
    if (profile) profile.avatar_url = result.url;
    await updateProfile({ avatar_url: result.url });
  }
  emit();
  return { success: !!result.url, url: result.url, error: result.error?.message || null };
}

export async function doUploadCover(file) {
  if (!file) return { success: false, error: 'No file' };
  const result = await uploadFile({ file, bucket: 'covers' });
  if (result.url) {
    if (profile) profile.cover_url = result.url;
    await updateProfile({ cover_url: result.url });
  }
  emit();
  return { success: !!result.url, url: result.url, error: result.error?.message || null };
}

// ---------------------------------------------------------------------------
// Compute balance
// ---------------------------------------------------------------------------
function computeBalance() {
  let earned = 0, spent = 0;
  for (const r of localLedger) {
    if (r.kind === 'earn') earned += Number(r.amount) || 0;
    else if (r.kind === 'spend') spent += Number(r.amount) || 0;
  }
  return { earned, spent, balance: earned - spent };
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------
export function useVioStore() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => {
    const s = getSessionObj();
    const p = getProfileObj();
    const posts = getPosts();
    const ledger = getLedger();
    const { earned, spent, balance } = computeBalance();
    const notifications = getNotificationsList();
    const savedPosts = getSavedPostsList();
    const unread = getUnreadCount();
    const transactions = getTransactionsList();
    const boosts = getBoostsList();
    const visibility = getVisibility();
    return {
      initialized,
      loading,
      session: s,
      profile: p,
      posts,
      ledger,
      earned,
      spent,
      balance,
      notifications,
      savedPosts,
      unreadCount: unread,
      transactions,
      boosts,
      visibility,
    };
  }, [version]);
  return value;
}
