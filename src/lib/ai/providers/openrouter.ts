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
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://maar-ai.vercel.app',
      'X-Title': 'MAAR AI',
    },
    // Server-side web search: OpenRouter itself runs the search and feeds
    // results to the model — no separate search API or client-side logic
    // needed on our end. Only added when the person explicitly enables it
    // (the composer's "Web search" toggle), since it costs extra even on
    // free models. Requires a model that supports tool calling; if the
    // selected model doesn't, OpenRouter returns an error, which surfaces
    // through the normal friendly-error path.
    extraBody: req.webSearch
      ? {
          tools: [
            {
              type: 'openrouter:web_search',
              parameters: { engine: 'exa', max_results: 5 },
            },
          ],
        }
      : undefined,
  });
}
