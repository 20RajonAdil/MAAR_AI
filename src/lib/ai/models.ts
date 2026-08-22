import type { ModelDefinition } from './types';

/**
 * Registry of every model MAAR can talk to.
 *
 * To add a new model later: add one entry here with accurate capabilities.
 * Nothing else in the app needs to change — the model selector, the
 * multimodal composer gating, the free-models section, and automatic
 * fallback all read from this one file.
 *
 * Capability flags are intentionally conservative: if you are not certain
 * a model supports an input type, leave it out. MAAR never advertises a
 * capability a model doesn't actually have.
 *
 * `fallbackModelId` powers automatic failover: if a model errors with a
 * rate-limit or availability problem mid-conversation, MAAR retries the
 * same message against the fallback once and tells the person it switched.
 */
export const MODELS: ModelDefinition[] = [
  // --- NVIDIA Agent models -------------------------------------------------
  {
    id: 'deepseek-ai/deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    provider: 'nvidia-nim',
    description: 'Fast, general-purpose model tuned for everyday conversation and quick coding help.',
    bestFor: 'Everyday chat & quick coding help',
    fallbackModelId: 'deepseek/deepseek-v4-flash-0731',
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
    bestFor: 'Reasoning over images, audio & text together',
    fallbackModelId: 'google/gemini-3.7-flash',
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
    bestFor: 'Long-form writing & analysis',
    fallbackModelId: 'z-ai/glm-5.2',
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
    bestFor: 'Code generation & refactors',
    fallbackModelId: 'tencent/hy3',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 32_000,
    },
  },

  // --- OpenRouter Agent models ---------------------------------------------
  // Top models by real usage on OpenRouter (checked against
  // openrouter.ai/rankings and each model's own page, Aug 2026) — one
  // flagship or top-ranked model per major lab. Re-verify against
  // https://openrouter.ai/models before adding more; OpenRouter's lineup
  // changes independently of this file.
  {
    id: 'anthropic/claude-opus-5',
    label: 'Claude Opus 5',
    provider: 'openrouter',
    description:
      "Anthropic's flagship model for demanding reasoning, coding, and long-horizon agentic work, including visual analysis of charts and documents.",
    bestFor: 'Hardest coding & long-horizon agent tasks',
    fallbackModelId: 'google/gemini-3.7-flash',
    capabilities: {
      inputs: ['text', 'image-input'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 1_000_000,
    },
  },
  {
    id: 'openai/gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    provider: 'openrouter',
    description:
      "Fast, cost-efficient model in OpenAI's GPT-5.6 series, tuned for high-volume chat, classification, and lightweight agentic workflows.",
    bestFor: 'Fast everyday chat at low cost',
    fallbackModelId: 'deepseek/deepseek-v4-flash-0731',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 1_050_000,
    },
  },
  {
    id: 'google/gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    provider: 'openrouter',
    description: "Google's fast multimodal model for agentic workflows, coding, and complex multi-step reasoning.",
    bestFor: 'Multimodal reasoning & agentic workflows',
    fallbackModelId: 'anthropic/claude-opus-5',
    capabilities: {
      inputs: ['text', 'image-input'],
      streaming: true,
      reasoning: true,
      coding: true,
      contextWindow: 1_050_000,
    },
  },
  {
    id: 'deepseek/deepseek-v4-flash-0731',
    label: 'DeepSeek V4 Flash',
    provider: 'openrouter',
    description:
      "DeepSeek's efficiency-optimized mixture-of-experts model (13B active / 284B total), strong at agentic tasks, reasoning, and world knowledge. Currently OpenRouter's #1 model by weekly usage.",
    bestFor: 'High-volume agent workloads',
    fallbackModelId: 'deepseek-ai/deepseek-v4-flash',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 1_050_000,
    },
  },
  {
    id: 'deepseek/deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    provider: 'openrouter',
    description: "DeepSeek's larger, higher-quality Pro-tier model for demanding reasoning and coding tasks.",
    bestFor: 'Demanding reasoning & coding',
    fallbackModelId: 'tencent/hy3',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: true,
      coding: true,
      contextWindow: 1_000_000,
    },
  },
  {
    id: 'tencent/hy3',
    label: 'Hy3',
    provider: 'openrouter',
    description:
      "Tencent's 295B-parameter mixture-of-experts model (21B active) with configurable reasoning effort, built for coding, agentic workflows, and long-horizon tasks.",
    bestFor: 'Coding with adjustable reasoning depth',
    fallbackModelId: 'z-ai/glm-5.2',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: true,
      coding: true,
      contextWindow: 256_000,
    },
  },
  {
    id: 'xiaomi/mimo-v2.5',
    label: 'MiMo-V2.5',
    provider: 'openrouter',
    description:
      "Xiaomi's flagship omnimodal model, with strong agentic capability and top rankings on software-engineering benchmarks.",
    bestFor: 'Long-horizon software engineering',
    fallbackModelId: 'google/gemini-3.7-flash',
    capabilities: {
      inputs: ['text', 'image-input'],
      streaming: true,
      reasoning: true,
      coding: true,
      contextWindow: 1_000_000,
    },
  },
  {
    id: 'z-ai/glm-5.2',
    label: 'GLM 5.2',
    provider: 'openrouter',
    description:
      "Z.ai's large-scale reasoning model for complex software engineering and long-horizon agent tasks; reasoning is always on.",
    bestFor: 'Complex software-engineering agents',
    fallbackModelId: 'deepseek/deepseek-v4-pro',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: true,
      coding: true,
      contextWindow: 1_000_000,
    },
  },

  // --- Free models ----------------------------------------------------------
  // Zero per-token cost, subject to each provider's own free-tier rate
  // limits. OpenRouter's free catalog rotates — check
  // https://openrouter.ai/collections/free-models before adding more.
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    label: 'Nemotron 3 Ultra (Free)',
    provider: 'openrouter',
    description:
      'Open, frontier-reasoning MoE model from NVIDIA (55B active / 550B total), strong at multi-step reasoning, planning, and agent orchestration. Free to use.',
    bestFor: 'Free multi-step reasoning & planning',
    free: true,
    fallbackModelId: 'openrouter/free',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: true,
      coding: true,
      contextWindow: 1_000_000,
    },
  },
  {
    id: 'openrouter/free',
    label: 'Auto Free Router',
    provider: 'openrouter',
    description:
      "OpenRouter automatically picks whichever free model best fits your request. Handy as a fallback when a specific free model is rate-limited — the model actually used may vary between messages.",
    bestFor: 'Automatic pick from all free models',
    free: true,
    fallbackModelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    capabilities: {
      inputs: ['text'],
      streaming: true,
      reasoning: false,
      coding: true,
      contextWindow: 128_000,
    },
  },

  // --- Image generation -----------------------------------------------------
  // OpenRouter serves image generation through the same /chat/completions
  // endpoint with a `modalities` parameter — see
  // src/lib/ai/providers/openrouter-image.ts. Composer only shows this
  // model when "Generate image" mode is toggled on.
  {
    id: 'google/gemini-2.5-flash-image',
    label: 'Gemini 2.5 Flash Image',
    provider: 'openrouter',
    description: "Google's fast image generation model. Describe what you want and MAAR generates it.",
    bestFor: 'Generating images from a text prompt',
    capabilities: {
      inputs: ['text'],
      outputs: ['image'],
      streaming: false,
      reasoning: false,
      coding: false,
      contextWindow: 32_000,
    },
  },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;

/** The model used by the composer's "Generate image" mode. */
export const IMAGE_MODEL_ID = 'google/gemini-2.5-flash-image';

export function getModel(id: string): ModelDefinition | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelSupports(id: string, modality: ModelDefinition['capabilities']['inputs'][number]): boolean {
  const model = getModel(id);
  if (!model) return false;
  return modality === 'text' || model.capabilities.inputs.includes(modality);
}

/** Chat-capable models — excludes image-generation-only models like Gemini 2.5 Flash Image. */
export function chatModels(): ModelDefinition[] {
  return MODELS.filter((m) => !m.capabilities.outputs || m.capabilities.outputs.includes('text'));
}

export function imageGenerationModels(): ModelDefinition[] {
  return MODELS.filter((m) => m.capabilities.outputs?.includes('image'));
}
