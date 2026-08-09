// ============================================================================
// Vio — Supabase Client (singleton)
// Uses VITE_ environment variables — never hardcode secrets.
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Validates required Supabase environment variables.
 * Returns null if ok, or a user-facing error message if missing.
 */
export function getSupabaseConfigError() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your Supabase project values.'
    );
  }
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    return 'VITE_SUPABASE_URL does not look like a valid Supabase URL.';
  }
  return null;
}

// Lazy singleton — created on first access so module import never throws.
let _supabase = null;

function createSupabaseClient() {
  const configError = getSupabaseConfigError();
  if (configError) {
    // Return a proxy that throws a controlled error on any property access.
    // This avoids a module-level crash while still surfacing the config problem
    // clearly to any code that tries to use the client.
    const handler = {
      get(_, prop) {
        throw new Error(`Supabase not available: ${configError}`);
      },
    };
    return new Proxy({}, handler);
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // handles OAuth / magic-link redirects
    },
  });
}

/**
 * Singleton Supabase client.
 * - auth.autoRefreshToken is on by default (persistent sessions)
 * - Session is stored in localStorage by the Supabase SDK
 */
export const supabase = new Proxy({}, {
  get(target, prop) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop);
  },
  set(target, prop, value) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.set(_supabase, prop, value);
  },
  has(target, prop) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.has(_supabase, prop);
  },
  ownKeys(target) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.ownKeys(_supabase);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.getOwnPropertyDescriptor(_supabase, prop);
  },
});
