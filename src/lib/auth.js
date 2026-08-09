// ============================================================================
// Vio — Auth Service
// Wraps Supabase Auth calls. All functions return { data, error }.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Sign up a new user.
 * @param {string} email
 * @param {string} password
 * @param {object} [meta] — optional { display_name, username }
 * @returns {{ data, error }}
 */
export async function signUp(email, password, meta = {}) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        display_name: meta.display_name || '',
        username: meta.username || '',
      },
    },
  });

  // If email confirmation is disabled on Supabase, the session is returned immediately.
  // If enabled, data.session is null and the user must verify their email.
  return { data, error };
}

/**
 * Sign in an existing user.
 * @param {string} email
 * @param {string} password
 * @returns {{ data, error }}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  return { data, error };
}

/**
 * Send a password reset email.
 * @param {string} email
 * @returns {{ data, error }}
 */
export async function sendPasswordReset(email) {
  // The redirect URL must be configured in Supabase Dashboard > Authentication > Redirect URLs
  const redirectTo = `${window.location.origin}/reset-password`;
  const { data, error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo }
  );
  return { data, error };
}

// Alias for store.js backward compatibility
export const sendPasswordResetEmail = sendPasswordReset;

/**
 * Update password (after reset flow redirects back).
 * @param {string} newPassword
 * @returns {{ data, error }}
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}

/**
 * Sign out the current user (clears session).
 * @returns {{ error }}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current session (or null if not authenticated).
 * @returns {object|null}
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Alias for store.js compatibility
export const getCurrentSession = getSession;

/**
 * Get the current user (or null if not authenticated).
 * @returns {object|null}
 */
export function getUser() {
  return supabase.auth.getUser();
}

/**
 * Listen to auth state changes (login, logout, token refresh, etc).
 * @param {function} callback — receives (event, session)
 * @returns {function} unsubscribe
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
