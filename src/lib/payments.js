// ============================================================================
// Vio — Payments Service (Architecture Ready)
// Invoice tracking, payment history, and future provider integration.
// No external payment provider is integrated yet.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Create a payment invoice record.
 * @param {number} amount — in Vicoins (VCN)
 * @param {string} kind — 'topup','purchase','refund','payout','subscription'
 * @param {string} description
 * @returns {{ invoice, error }}
 */
export async function createInvoice(amount, kind, description = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { invoice: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('payment_invoices')
    .insert({ user_id: user.id, amount, kind, description })
    .select('*').single();

  return { invoice: data, error };
}

/**
 * Complete an invoice (simulate payment success for now).
 * @param {string} invoiceId
 * @param {string} [provider] — future Stripe/PayPal
 * @returns {{ error }}
 */
export async function completeInvoice(invoiceId, provider = 'vio_wallet') {
  const { error } = await supabase
    .from('payment_invoices')
    .update({ status: 'completed', provider })
    .eq('id', invoiceId);

  return { error };
}

/**
 * Get user's payment history.
 */
export async function getPaymentHistory({ limit = 50, offset = 0 } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { invoices: [], error: new Error('Not authenticated'), count: 0 };

  const { data, error, count } = await supabase
    .from('payment_invoices')
    .select('*', { count: 'estimated' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { invoices: data || [], error, count };
}
