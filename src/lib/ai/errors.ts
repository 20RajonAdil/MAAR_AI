import type { MaarErrorCode } from './types';

/**
 * Every error the user ever sees is friendly and actionable. Raw provider
 * error bodies, stack traces, and status text never reach the client.
 */
const FRIENDLY_MESSAGES: Record<MaarErrorCode, string> = {
  'no-api-key':
    'MAAR isn’t connected to NVIDIA yet. Add NVIDIA_API_KEY to your server environment and restart the app.',
  unauthorized:
    'NVIDIA rejected the request. The API key may be invalid or expired — check your server environment.',
  'rate-limited': 'NVIDIA is rate-limiting requests right now. Wait a few seconds and try again.',
  'model-unavailable': 'This model is temporarily unavailable. Try again shortly or switch models.',
  network: 'Couldn’t reach NVIDIA — check your internet connection and try again.',
  timeout: 'The request took too long and timed out. Try again, or try a shorter prompt.',
  'unsupported-input': 'The selected model doesn’t support this kind of attachment. Try a different model.',
  'context-too-large': 'This conversation is too long for the selected model. Start a new chat or trim earlier messages.',
  unknown: 'Something went wrong generating a response. Please try again.',
};

export function friendlyErrorMessage(code: MaarErrorCode): string {
  return FRIENDLY_MESSAGES[code] ?? FRIENDLY_MESSAGES.unknown;
}

export function classifyHttpError(status: number): MaarErrorCode {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rate-limited';
  if (status === 404) return 'model-unavailable';
  if (status === 413) return 'context-too-large';
  if (status === 408 || status === 504) return 'timeout';
  if (status >= 500) return 'model-unavailable';
  return 'unknown';
}

export class MaarProviderError extends Error {
  code: MaarErrorCode;
  constructor(code: MaarErrorCode, message?: string) {
    super(message ?? friendlyErrorMessage(code));
    this.code = code;
    this.name = 'MaarProviderError';
  }
}
