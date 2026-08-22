'use client';

import type { MaarErrorCode } from './types';

export interface GenerateImageResult {
  ok: true;
  images: string[];
}

export interface GenerateImageFailure {
  ok: false;
  errorCode: MaarErrorCode;
  message: string;
}

export async function generateImageClient(
  prompt: string,
  model: string,
  signal?: AbortSignal,
): Promise<GenerateImageResult | GenerateImageFailure> {
  try {
    const response = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
      signal,
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.images) {
      return {
        ok: false,
        errorCode: json?.errorCode ?? 'unknown',
        message: json?.error ?? 'Something went wrong generating that image.',
      };
    }

    return { ok: true, images: json.images as string[] };
  } catch {
    if (signal?.aborted) {
      return { ok: false, errorCode: 'timeout', message: 'Image generation was stopped.' };
    }
    return { ok: false, errorCode: 'network', message: "Couldn't reach the image generation service." };
  }
}
