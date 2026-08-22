import 'server-only';
import type { CompletionRequest, ModelDefinition, StreamChunk } from '../types';
import { streamOpenAICompatible } from './shared';

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export async function* streamNvidiaCompletion(
  req: CompletionRequest,
  model: ModelDefinition,
): AsyncGenerator<StreamChunk> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    yield { type: 'error', errorCode: 'no-api-key' };
    return;
  }

  yield* streamOpenAICompatible({
    baseUrl: process.env.NVIDIA_API_BASE_URL || DEFAULT_BASE_URL,
    apiKey,
    model,
    messages: req.messages,
    temperature: req.temperature,
    maxTokens: req.maxTokens,
    signal: req.signal,
  });
}
