// ============================================================================
// Vio — Collections Service
// Organize saved posts into named collections.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Create a new collection.
 */
export async function createCollection(name, description = '', icon = 'bookmark') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { collection: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('saved_collections')
    .insert({ user_id: user.id, name, description, icon })
    .select('*').single();

  return { collection: data, error };
}

/**
 * Get all collections for the current user.
 */
export async function getCollections() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { collections: [], error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('saved_collections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return { collections: data || [], error };
}

/**
 * Delete a collection.
 */
export async function deleteCollection(id) {
  const { error } = await supabase.from('saved_collections').delete().eq('id', id);
  return { error };
}
