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
