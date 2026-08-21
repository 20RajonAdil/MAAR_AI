/**
 * Shared helpers for parsing an OpenAI-compatible Server-Sent Events (SSE)
 * stream. Used by the server route (reading from NVIDIA) and re-used
 * verbatim if a future provider also speaks SSE.
 */

export interface SSEEvent {
  data: string;
}

/** Turns a fetch() Response body into an async generator of SSE data payloads. */
export async function* parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary: number;
      // SSE frames are separated by a blank line.
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;
        const data = line.slice(5).trim();
        if (data) yield data;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Encodes a chunk as an SSE frame for our own /api/chat -> browser stream. */
export function encodeSSE(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}
