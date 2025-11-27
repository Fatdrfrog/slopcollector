import { Client } from '@upstash/qstash';

const globalForUpstash = globalThis as unknown as {
  qstashClient: Client | undefined;
};

export const qstashClient =
  globalForUpstash.qstashClient ??
  new Client({
    token: process.env.QSTASH_TOKEN!,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForUpstash.qstashClient = qstashClient;
}
