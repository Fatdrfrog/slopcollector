import Stripe from 'stripe';
import { getServerEnv } from '../env';

/**
 * Stripe Integration (Optional)
 * Works without STRIPE_SECRET_KEY - returns null/free tier
 * Add key later when ready to monetize
 */

const globalStripe = globalThis as {
  __stripeClient?: Stripe;
};

export interface UsageEntitlement {
  plan: 'free' | 'pro';
  aiRunsPerDay: number;
  snapshotsPerDay: number;
}

/**
 * Get Stripe client (returns null if key not configured)
 */
export function getStripeClient(): Stripe | null {
  const { stripeSecretKey } = getServerEnv();
  if (!stripeSecretKey) {
    return null; // App works without Stripe
  }

  if (!globalStripe.__stripeClient) {
    globalStripe.__stripeClient = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  return globalStripe.__stripeClient;
}

/**
 * Get usage entitlement (defaults to free tier if no Stripe)
 */
export function getUsageEntitlement(customerMetadata?: Record<string, unknown>): UsageEntitlement {
  const plan = (customerMetadata?.plan as UsageEntitlement['plan']) ?? 'free';
  if (plan === 'pro') {
    return { plan: 'pro', aiRunsPerDay: 50, snapshotsPerDay: 24 };
  }
  // Free tier - generous for early users
  return { plan: 'free', aiRunsPerDay: 10, snapshotsPerDay: 20 };
}

/**
 * Ensure Stripe customer exists (returns null if Stripe not configured)
 */
export async function ensureStripeCustomer(userId: string, email?: string) {
  const stripe = getStripeClient();
  if (!stripe) return null; // Stripe optional

  try {
    const search = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${userId}'`,
    });

    if (search.data.length > 0) {
      return search.data[0];
    }

    return stripe.customers.create({
      email,
      metadata: { supabase_user_id: userId },
    });
  } catch (error) {
    console.error('Stripe error (ignored):', error);
    return null; // Fail gracefully
  }
}

