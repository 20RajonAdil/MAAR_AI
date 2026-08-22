import 'server-only';
import type { ChatAttachment, ChatMessage, ModelDefinition, StreamChunk } from '../types';
import { classifyHttpError } from '../errors';
import { parseSSEStream } from '../streaming';

/**
 * Both NVIDIA NIM and OpenRouter speak the same OpenAI-compatible
 * `/chat/completions` shape with `stream: true`. This helper does the
 * actual HTTP call + SSE parsing once; each provider file just supplies
 * its base URL, API key, and any provider-specific headers.
 */
export interface OpenAICompatibleRequest {
  baseUrl: string;
  apiKey: string;
  extraHeaders?: Record<string, string>;
  model: ModelDefinition;
  messages: Pick<ChatMessage, 'role' | 'content' | 'attachments'>[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

function toOpenAIContent(message: Pick<ChatMessage, 'role' | 'content' | 'attachments'>) {
  const images = (message.attachments ?? []).filter((a: ChatAttachment) => a.kind === 'image');
  if (images.length === 0) return message.content;
  return [
    { type: 'text', text: message.content },
    ...images.map((img) => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
  ];
}

export async function* streamOpenAICompatible(req: OpenAICompatibleRequest): AsyncGenerator<StreamChunk> {
  const hasImages = req.messages.some((m) => (m.attachments ?? []).some((a) => a.kind === 'image'));
  if (hasImages && !req.model.capabilities.inputs.includes('image-input')) {
    yield { type: 'error', errorCode: 'unsupported-input' };
    return;
  }

  const body = {
    model: req.model.id,
    messages: req.messages.map((m) => ({ role: m.role, content: toOpenAIContent(m) })),
    temperature: req.temperature ?? 0.6,
    max_tokens: req.maxTokens ?? 2048,
    stream: true,
  };

  let response: Response;
  try {
    response = await fetch(`${req.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${req.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...req.extraHeaders,
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

      // Reasoning-capable models expose their "thinking" phase under a
      // separate field (NVIDIA: reasoning_content, some OpenRouter-routed
      // models: reasoning) before `content` starts. We surface only a
      // status label, never the hidden trace itself.
      const reasoningText = delta.reasoning_content ?? delta.reasoning;
      if (reasoningText && !delta.content) {
        if (req.model.capabilities.reasoning && !sawReasoningStatus) {
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
