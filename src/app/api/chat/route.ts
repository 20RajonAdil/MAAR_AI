import { NextRequest } from 'next/server';
import { streamCompletion } from '@/lib/ai/provider';
import { encodeSSE } from '@/lib/ai/streaming';
import { getModel } from '@/lib/ai/models';
import type { StreamChunk } from '@/lib/ai/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  const { model, messages } = payload ?? {};

  if (!model || !getModel(model)) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encodeSSE({ type: 'error', errorCode: 'model-unavailable' } satisfies StreamChunk));
        controller.close();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('messages is required', { status: 400 });
  }

  const abortController = new AbortController();
  req.signal.addEventListener('abort', () => abortController.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamCompletion({ model, messages, signal: abortController.signal })) {
          controller.enqueue(encodeSSE(chunk));
        }
      } catch {
        controller.enqueue(encodeSSE({ type: 'error', errorCode: 'unknown' } satisfies StreamChunk));
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
