import type { ModelDefinition } from './types';

/**
 * Registry of available NVIDIA NIM models.
 *
 * To add a new model later: add one entry here with accurate capabilities.
 * Nothing else in the app needs to change — the model selector, the
 * multimodal composer gating, and the API route all read from this file.
 *
 * Capability flags are intentionally conservative: if you are not certain
 * a model supports an input type, leave it out. MAAR never advertises a
 * capability a model doesn't actually have.
 */
export const MODELS: ModelDefinition[] = [
  {
    id: 'deepseek-ai/deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    provider: 'nvidia-nim',
    description: 'Fast, general-purpose model tuned for everyday conversation and quick coding help.',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 128_000,
    },
  },
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    label: 'Nemotron 3 Nano Omni (Reasoning)',
    provider: 'nvidia-nim',
    description: 'Reasoning-focused model with multimodal input. Shows a "Reasoning…" status while it thinks.',
    capabilities: {
      inputs: ['text', 'image-input', 'audio-input'],
      streaming: true,
      reasoning: true,
      coding: true,
      contextWindow: 128_000,
    },
  },
  {
    id: 'meta/llama-3.3-70b-instruct',
    label: 'Llama 3.3 70B Instruct',
    provider: 'nvidia-nim',
    description: 'Balanced, general-purpose instruct model. Good default for long-form writing and analysis.',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 128_000,
    },
  },
  {
    id: 'qwen/qwen2.5-coder-32b-instruct',
    label: 'Qwen 2.5 Coder 32B',
    provider: 'nvidia-nim',
    description: 'Specialized for code generation, refactors, and explaining unfamiliar codebases.',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 32_000,
    },
  },

  // --- OpenRouter models --------------------------------------------------
  // OpenRouter proxies many providers behind one OpenAI-compatible API.
  // Capabilities below reflect each model's own documented support — verify
  // against https://openrouter.ai/models before enabling a new one, since
  // OpenRouter's catalog changes independently of this file.
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openrouter',
    description: 'Fast, inexpensive general-purpose model with vision support, via OpenRouter.',
    capabilities: {
      inputs: ['text', 'image-input'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 128_000,
    },
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet',
    provider: 'openrouter',
    description: 'Strong all-round reasoning, writing, and coding model, via OpenRouter.',
    capabilities: {
      inputs: ['text', 'image-input'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 200_000,
    },
  },
  {
    id: 'google/gemini-2.0-flash-001',
    label: 'Gemini 2.0 Flash',
    provider: 'openrouter',
    description: 'Fast multimodal model with a very large context window, via OpenRouter.',
    capabilities: {
      inputs: ['text', 'image-input'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 1_000_000,
    },
  },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;

export function getModel(id: string): ModelDefinition | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelSupports(id: string, modality: ModelDefinition['capabilities']['inputs'][number]): boolean {
  const model = getModel(id);
  if (!model) return false;
  return modality === 'text' || model.capabilities.inputs.includes(modality);
}
