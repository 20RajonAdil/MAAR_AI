import 'server-only';
import type { ChatAttachment, ChatMessage, CompletionRequest, StreamChunk } from './types';
import { getModel } from './models';
import { classifyHttpError, MaarProviderError } from './errors';
import { parseSSEStream } from './streaming';

/**
 * SERVER-ONLY NVIDIA NIM provider.
 *
 * This file must never be imported from a client component. The
 * `server-only` import above makes that a build-time error if it happens
 * by accident. It is the single place that knows about NVIDIA's request
 * shape, so a future provider only needs a sibling file with the same
 * function signature.
 */

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';

function toOpenAIContent(message: Pick<ChatMessage, 'role' | 'content' | 'attachments'>) {
  const images = (message.attachments ?? []).filter((a: ChatAttachment) => a.kind === 'image');
  if (images.length === 0) {
    return message.content;
  }
  return [
    { type: 'text', text: message.content },
    ...images.map((img) => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
  ];
}

export async function* streamCompletion(req: CompletionRequest): AsyncGenerator<StreamChunk> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    yield { type: 'error', errorCode: 'no-api-key' };
    return;
  }

  const model = getModel(req.model);
  if (!model) {
    yield { type: 'error', errorCode: 'model-unavailable' };
    return;
  }

  const baseUrl = process.env.NVIDIA_API_BASE_URL || DEFAULT_BASE_URL;
  const hasImages = req.messages.some((m) => (m.attachments ?? []).some((a) => a.kind === 'image'));
  if (hasImages && !model.capabilities.inputs.includes('image-input')) {
    yield { type: 'error', errorCode: 'unsupported-input' };
    return;
  }

  const body = {
    model: req.model,
    messages: req.messages.map((m) => ({ role: m.role, content: toOpenAIContent(m) })),
    temperature: req.temperature ?? 0.6,
    max_tokens: req.maxTokens ?? 2048,
    stream: true,
  };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: req.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      yield { type: 'done' };
      return;
    }
    yield { type: 'error', errorCode: 'network' };
    return;
  }

  if (!response.ok || !response.body) {
    yield { type: 'error', errorCode: classifyHttpError(response.status) };
    return;
  }

  let sawReasoningStatus = false;

  try {
    for await (const data of parseSSEStream(response.body)) {
      if (data === '[DONE]') break;

      let json: any;
      try {
        json = JSON.parse(data);
      } catch {
        continue; // ignore malformed keep-alive frames
      }

      const choice = json?.choices?.[0];
      const delta = choice?.delta;
      if (!delta) continue;

      // Some reasoning-capable NIM models expose a separate
      // `reasoning_content` field while thinking, before `content` starts.
      // We surface only a status label, never the hidden trace itself.
      if (delta.reasoning_content && !delta.content) {
        if (model.capabilities.reasoning && !sawReasoningStatus) {
          sawReasoningStatus = true;
          yield { type: 'reasoning-status', reasoningStatus: 'Reasoning…' };
        }
        continue;
      }

      if (typeof delta.content === 'string' && delta.content.length > 0) {
        yield { type: 'delta', delta: delta.content };
      }
    }
    yield { type: 'done' };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      yield { type: 'done' };
      return;
    }
    yield { type: 'error', errorCode: 'timeout' };
  }
}

export class NvidiaProviderError extends MaarProviderError {}
