'use client';

import type { ChatMessage, MaarErrorCode, StreamChunk } from './types';

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onReasoningStatus: (status: string) => void;
  onError: (code: MaarErrorCode) => void;
  onDone: () => void;
}

/**
 * Browser-side entry point used by the chat UI. It never talks to NVIDIA
 * directly — only to our own same-origin /api/chat route, which holds the
 * real API key server-side.
 */
export async function streamChat(
  params: { model: string; messages: Pick<ChatMessage, 'role' | 'content' | 'attachments'>[] },
  callbacks: StreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal,
    });
  } catch {
    if (signal.aborted) return callbacks.onDone();
    return callbacks.onError('network');
  }

  if (!response.ok || !response.body) {
    return callbacks.onError('network');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;

        const chunk: StreamChunk = JSON.parse(line.slice(5).trim());
        if (chunk.type === 'delta' && chunk.delta) callbacks.onDelta(chunk.delta);
        else if (chunk.type === 'reasoning-status' && chunk.reasoningStatus)
          callbacks.onReasoningStatus(chunk.reasoningStatus);
        else if (chunk.type === 'error') callbacks.onError(chunk.errorCode ?? 'unknown');
        else if (chunk.type === 'done') {
          callbacks.onDone();
          return;
        }
      }
    }
    callbacks.onDone();
  } catch {
    if (signal.aborted) callbacks.onDone();
    else callbacks.onError('network');
  } finally {
    reader.releaseLock();
  }
}
