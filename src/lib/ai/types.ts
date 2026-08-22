/**
 * Core types for the MAAR AI provider abstraction layer.
 *
 * The chat UI never talks to NVIDIA directly — it only knows about these
 * shapes. That means swapping NVIDIA for another OpenAI-compatible NIM
 * endpoint, or adding a second provider later, never requires touching
 * components in src/components.
 */

export type ModelModality = 'text' | 'image-input' | 'audio-input' | 'video-input';

export interface ModelCapabilities {
  /** What kinds of input this model actually accepts. 'text' is implicit for all. */
  inputs: ModelModality[];
  /** What this model produces. Defaults to ['text'] when omitted — only set
   * this when a model can also produce images (image generation). */
  outputs?: ('text' | 'image')[];
  /** Whether the model streams tokens back progressively. */
  streaming: boolean;
  /** Whether the model exposes a distinct "reasoning" phase (shown as a status, never the raw trace). */
  reasoning: boolean;
  /** Strong at generating/explaining code. Drives UI copy, not a hard gate. */
  coding: boolean;
  /** Approximate context window, for the UI's context-length warnings. */
  contextWindow: number;
}

export interface ModelDefinition {
  id: string; // NVIDIA NIM model id, e.g. "deepseek-ai/deepseek-v4-flash"
  label: string; // human-facing name
  provider: 'nvidia-nim' | 'openrouter'; // add new providers here as the union grows
  description: string;
  /** Short, plain-language "best for" tag shown as a badge in the model picker. */
  bestFor: string;
  /** True for models with no per-token cost (subject to the provider's own free-tier limits). */
  free?: boolean;
  /** If this model errors with a rate-limit or availability problem, MAAR
   * automatically retries the same request once against this model instead,
   * and tells the person it switched. Point it at a capability-equivalent
   * model, ideally on a different provider for real redundancy. */
  fallbackModelId?: string;
  capabilities: ModelCapabilities;
}

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  /** data URL — attachments live only in IndexedDB / memory, never uploaded anywhere but the provider call itself. */
  dataUrl: string;
  kind: 'image' | 'audio' | 'video' | 'file';
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  attachments?: ChatAttachment[];
  createdAt: number;
  /** Present while an assistant message is still streaming. */
  isStreaming?: boolean;
  /** Set if generation was stopped early by the user. */
  stopped?: boolean;
  /** Set if generation failed. Holds a friendly, already-sanitized message. */
  error?: string;
  model?: string;
}

export interface StreamChunk {
  type: 'delta' | 'reasoning-status' | 'done' | 'error';
  delta?: string;
  reasoningStatus?: string;
  errorMessage?: string;
  errorCode?: MaarErrorCode;
}

export type MaarErrorCode =
  | 'no-api-key'
  | 'unauthorized'
  | 'rate-limited'
  | 'model-unavailable'
  | 'network'
  | 'timeout'
  | 'unsupported-input'
  | 'context-too-large'
  | 'image-generation-failed'
  | 'unknown';

export interface CompletionRequest {
  model: string;
  messages: Pick<ChatMessage, 'role' | 'content' | 'attachments'>[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}
