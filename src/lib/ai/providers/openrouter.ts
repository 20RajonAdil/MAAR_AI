import 'server-only';
import type { CompletionRequest, ModelDefinition, StreamChunk } from '../types';
import { streamOpenAICompatible } from './shared';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

export async function* streamOpenRouterCompletion(
  req: CompletionRequest,
  model: ModelDefinition,
): AsyncGenerator<StreamChunk> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    yield { type: 'error', errorCode: 'no-api-key' };
    return;
  }

  yield* streamOpenAICompatible({
    baseUrl: process.env.OPENROUTER_API_BASE_URL || DEFAULT_BASE_URL,
    apiKey,
    model,
    messages: req.messages,
    temperature: req.temperature,
    maxTokens: req.maxTokens,
    signal: req.signal,
    extraHeaders: {
      // OpenRouter uses these to attribute usage to your app in their
      // dashboard and (for some free-tier models) to apply rate limits.
      // Both are optional but recommended by OpenRouter's docs.
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://maar.ai',
      'X-Title': 'MAAR AI',
    },
  });
}
