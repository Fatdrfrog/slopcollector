export interface SchedulerOption {
  id: 'supabase-schedule' | 'github-actions' | 'cloudflare-cron';
  title: string;
  description: string;
  worksWithoutVercelPro: boolean;
  requiresExternalInfra: boolean;
  pros: string[];
  cons: string[];
  recommendedWhen: string[];
}

export const schedulerOptions: SchedulerOption[] = [
  {
    id: 'supabase-schedule',
    title: 'Supabase Scheduled Triggers',
    description:
      'Native cron support that calls an Edge Function or HTTP endpoint directly from the Supabase platform.',
    worksWithoutVercelPro: true,
    requiresExternalInfra: false,
    pros: [
      'Stays within Supabase so credentials, logging, and RLS context remain aligned.',
      'Low latency trigger into Edge Functions—ideal for refreshing schema snapshots or AI advice nightly.',
      'UI-based configuration with per-job retry and observability baked in.',
    ],
    cons: [
      'Limited to 1-minute granularity and 60-second execution time.',
      'Jobs are project-scoped—no global dashboard across multiple Supabase projects yet.',
    ],
    recommendedWhen: [
      'All critical data already lives in Supabase.',
      'You need predictable jobs without managing another runtime.',
      'Cron frequency is hourly or daily (schema sync, advice refresh).',
    ],
  },
  {
    id: 'github-actions',
    title: 'GitHub Actions Cron',
    description:
      'Infrastructure-as-code option using GitHub Actions’ scheduled workflows to hit our internal APIs.',
    worksWithoutVercelPro: true,
    requiresExternalInfra: true,
    pros: [
      'No extra cost beyond GitHub Actions minutes; integrates with existing repo.',
      'Great for heavier transforms (e.g., nightly OpenAI batch runs) since runtime can exceed 60 seconds.',
      'Supports secrets versioning and reviewable YAML workflows.',
    ],
    cons: [
      'Depends on GitHub availability; cold start on each run.',
      'Need to manage Supabase service role key as GitHub secret and rotate manually.',
    ],
    recommendedWhen: [
      'The team already uses GitHub Actions pipelines.',
      'Batch workloads exceed Supabase Edge runtime limits.',
      'You want jobs defined alongside code for PR reviews.',
    ],
  },
  {
    id: 'cloudflare-cron',
    title: 'Cloudflare Workers Cron',
    description:
      'Serverless cron using Cloudflare Workers/Queues to invoke our internal routes or Supabase Edge Functions.',
    worksWithoutVercelPro: true,
    requiresExternalInfra: true,
    pros: [
      'Always-on global edge runtime with generous free tier.',
      'Queues can smooth out spikes when AI advisors take longer.',
      'Easy to wire into observability (Workers Metrics, Sentry).',
    ],
    cons: [
      'Adds another deployment artifact to maintain.',
      'Need to bridge Supabase auth (service role key) safely across providers.',
    ],
    recommendedWhen: [
      'You need sub-minute cron cadence or background queue semantics.',
      'Team is comfortable with Workers KV/Durable Objects for temporary storage.',
    ],
  },
];

export interface InfrastructureRecommendation {
  primary: 'supabase';
  secondary: Array<'github-actions' | 'cloudflare-cron'>;
  rationale: string[];
  convexTradeoffs: {
    stayOnSupabase: string[];
    moveToConvex: string[];
  };
}

export const infrastructureRecommendation: InfrastructureRecommendation = {
  primary: 'supabase',
  secondary: ['github-actions'],
  rationale: [
    'Multi-tenant data, RLS, and auth are already modeled in Supabase—moving state to Convex would duplicate effort.',
    'Supabase Scheduled Triggers remove the need for Vercel Pro while keeping cron jobs co-located with the data.',
    'Edge Functions plus the service client let us run OpenAI prompts securely without widening the attack surface.',
  ],
  convexTradeoffs: {
    stayOnSupabase: [
      'Single source of truth in Postgres keeps schema snapshots, advice runs, and audit history transactional.',
      'Supabase Auth + RLS handle tenant isolation natively; Convex would require custom RBAC rewrites.',
      'Storage, cron, and vector tooling (pgvector) stay in one stack, simplifying hackathon delivery.',
    ],
    moveToConvex: [
      'Convex offers built-in scheduler and reactive queries, but would force schema migration to their document model.',
      'You would still need Supabase for auth/storage to satisfy judging criteria, creating dual persistence layers.',
    ],
  },
};

