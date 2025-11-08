import Stripe from 'stripe';
import { getServerEnv } from '../env';

const globalStripe = globalThis as {
  __stripeClient?: Stripe;
};

export interface UsageEntitlement {
  plan: 'free' | 'pro';
  aiRunsPerDay: number;
  snapshotsPerDay: number;
}

export function getStripeClient(): Stripe | null {
  const { stripeSecretKey } = getServerEnv();
  if (!stripeSecretKey) {
    return null;
  }

  if (!globalStripe.__stripeClient) {
    globalStripe.__stripeClient = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });
  }

  return globalStripe.__stripeClient;
}

export function getUsageEntitlement(customerMetadata?: Record<string, unknown>): UsageEntitlement {
  const plan = (customerMetadata?.plan as UsageEntitlement['plan']) ?? 'free';
  if (plan === 'pro') {
    return { plan: 'pro', aiRunsPerDay: 50, snapshotsPerDay: 24 };
  }
  return { plan: 'free', aiRunsPerDay: 5, snapshotsPerDay: 6 };
}

export async function ensureStripeCustomer(userId: string, email?: string) {
  const stripe = getStripeClient();
  if (!stripe) return null;

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
}

