import 'server-only';
import type { CompletionRequest, StreamChunk } from './types';
import { getModel } from './models';
import { MaarProviderError } from './errors';
import { streamNvidiaCompletion } from './providers/nvidia';
import { streamOpenRouterCompletion } from './providers/openrouter';

/**
 * SERVER-ONLY provider dispatcher.
 *
 * This file must never be imported from a client component — every file
 * in the `providers/` chain starts with `import 'server-only'`, which
 * makes that a build-time error if it happens by accident.
 *
 * To add a new provider: create `providers/yourprovider.ts` exporting a
 * `streamYourProviderCompletion(req, model)` async generator (most
 * OpenAI-compatible APIs can reuse `providers/shared.ts` the way NVIDIA
 * and OpenRouter do), add a case below, and add `provider: 'yourprovider'`
 * to the relevant entries in `models.ts`. Nothing else in the app needs
 * to change — the model selector and composer read capabilities from the
 * same registry regardless of which provider backs a model.
 */
export async function* streamCompletion(req: CompletionRequest): AsyncGenerator<StreamChunk> {
  const model = getModel(req.model);
  if (!model) {
    yield { type: 'error', errorCode: 'model-unavailable' };
    return;
  }

  switch (model.provider) {
    case 'nvidia-nim':
      yield* streamNvidiaCompletion(req, model);
      return;
    case 'openrouter':
      yield* streamOpenRouterCompletion(req, model);
      return;
    default: {
      // Exhaustiveness check: if a new provider is added to the union in
      // types.ts without a case here, this line fails to type-check.
      const _exhaustive: never = model.provider;
      void _exhaustive;
      yield { type: 'error', errorCode: 'model-unavailable' };
    }
  }
}

export class ProviderError extends MaarProviderError {}
