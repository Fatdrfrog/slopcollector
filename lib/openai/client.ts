import OpenAI from 'openai';
import { getServerEnv } from '../env';

const globalCache = globalThis as {
  __openaiClient?: OpenAI;
};

export function getOpenAIClient(): OpenAI {
  if (!globalCache.__openaiClient) {
    const { openaiApiKey } = getServerEnv();
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    globalCache.__openaiClient = new OpenAI({
      apiKey: openaiApiKey,
    });
  }
  return globalCache.__openaiClient;
}

