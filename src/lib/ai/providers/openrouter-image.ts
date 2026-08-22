import 'server-only';
import { classifyHttpError } from '../errors';
import type { MaarErrorCode } from '../types';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

export interface ImageGenerationResult {
  ok: true;
  images: string[]; // data URLs, e.g. "data:image/png;base64,..."
}

export interface ImageGenerationError {
  ok: false;
  errorCode: MaarErrorCode;
}

/**
 * OpenRouter generates images through the same /chat/completions endpoint
 * used for text, by setting `modalities: ["image", "text"]`. The model's
 * response then includes an `images` array of base64 data URLs on the
 * assistant message, instead of (or alongside) `content` text.
 * See: https://openrouter.ai/docs/guides/overview/multimodal/image-generation
 */
export async function generateImage(
  modelId: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<ImageGenerationResult | ImageGenerationError> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, errorCode: 'no-api-key' };
  }

  const baseUrl = process.env.OPENROUTER_API_BASE_URL || DEFAULT_BASE_URL;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://maar-ai.vercel.app',
        'X-Title': 'MAAR AI',
      },
      body: JSON.stringify({
        model: modelId,
        modalities: ['image', 'text'],
        stream: false,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, errorCode: 'timeout' };
    }
    return { ok: false, errorCode: 'network' };
  }

  if (!response.ok) {
    return { ok: false, errorCode: classifyHttpError(response.status) };
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    return { ok: false, errorCode: 'image-generation-failed' };
  }

  const message = json?.choices?.[0]?.message;

  // Defensively support the couple of shapes OpenRouter/providers may use
  // for the returned images, since this is a newer part of their API.
  const rawImages: any[] = message?.images ?? [];
  const images: string[] = rawImages
    .map((img) => (typeof img === 'string' ? img : img?.image_url?.url ?? img?.url))
    .filter((url): url is string => typeof url === 'string' && url.length > 0);

  if (images.length === 0) {
    return { ok: false, errorCode: 'image-generation-failed' };
  }

  return { ok: true, images };
}
