import 'server-only';
import type { ChatAttachment, ChatMessage, Citation, ModelDefinition, StreamChunk } from '../types';
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
  /** Extra fields merged into the request body — e.g. OpenRouter's `tools` array for web search. */
  extraBody?: Record<string, unknown>;
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

function extractCitations(annotations: any[] | undefined, into: Map<string, Citation>) {
  if (!Array.isArray(annotations)) return;
  for (const a of annotations) {
    const urlCitation = a?.url_citation ?? (a?.type === 'url_citation' ? a : null);
    const url: string | undefined = urlCitation?.url;
    if (url && !into.has(url)) {
      into.set(url, { url, title: urlCitation?.title });
    }
  }
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
    max_tokens: req.maxTokens ?? 8192,
    stream: true,
    ...req.extraBody,
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
  const citations = new Map<string, Citation>();

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

      // Web search (openrouter:web_search tool) returns source citations via
      // an `annotations` array, which different providers may attach to the
      // streaming delta or only to the final message — we check both.
      extractCitations(delta.annotations, citations);
      extractCitations(choice?.message?.annotations, citations);

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
    if (citations.size > 0) {
      yield { type: 'citations', citations: [...citations.values()] };
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
