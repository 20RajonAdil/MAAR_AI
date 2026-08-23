'use client';

import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { Brain, Check, ChevronDown, Code2, Gift, Image as ImageIcon, Mic, Zap } from 'lucide-react';
import { chatModels, getModel } from '@/lib/ai/models';
import type { ModelDefinition } from '@/lib/ai/types';
import { cn } from '@/lib/utils/cn';

interface Props {
  value: string;
  onChange: (modelId: string) => void;
}

type GroupKey = 'free' | 'nvidia-nim' | 'openrouter';

const GROUP_LABELS: Record<GroupKey, string> = {
  free: 'Free models',
  'nvidia-nim': 'NVIDIA Agent',
  openrouter: 'OpenRouter Agent',
};

function groupFor(model: ModelDefinition): GroupKey {
  if (model.free) return 'free';
  return model.provider;
}

function CapabilityIcons({ model }: { model: ModelDefinition }) {
  const { capabilities } = model;
  return (
    <div className="flex items-center gap-1.5 text-ink-faint">
      {model.free && (
        <span title="Free to use">
          <Gift size={12} />
        </span>
      )}
      {capabilities.streaming && (
        <span title="Streams responses">
          <Zap size={12} />
        </span>
      )}
      {capabilities.reasoning && (
        <span title="Reasoning model">
          <Brain size={12} />
        </span>
      )}
      {capabilities.coding && (
        <span title="Strong at code">
          <Code2 size={12} />
        </span>
      )}
      {capabilities.inputs.includes('image-input') && (
        <span title="Accepts image input">
          <ImageIcon size={12} />
        </span>
      )}
      {capabilities.inputs.includes('audio-input') && (
        <span title="Accepts audio input">
          <Mic size={12} />
        </span>
      )}
    </div>
  );
}

export function ModelSelector({ value, onChange }: Props) {
  const active = getModel(value);
  const models = chatModels();

  const groupOrder: GroupKey[] = ['free', 'nvidia-nim', 'openrouter'];
  const groups = groupOrder
    .map((key) => ({ key, models: models.filter((m) => groupFor(m) === key) }))
    .filter((g) => g.models.length > 0);

  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border bg-base-raised2/60 px-3 py-1.5 text-sm text-ink transition-colors hover:border-border-strong hover:bg-base-raised2"
          aria-label="Select AI model"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          <span className="max-w-[8.5rem] truncate font-medium sm:max-w-none">{active?.label ?? 'Select model'}</span>
          <ChevronDown size={14} className="text-ink-faint" />
        </button>
      </RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align="start"
          sideOffset={8}
          className="z-50 max-h-[70vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-base-raised p-1.5 shadow-panel"
        >
          {groups.map(({ key, models: groupModels }) => (
            <div key={key}>
              <div className="px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-ink-faint">
                {GROUP_LABELS[key]}
              </div>
              {groupModels.map((model) => (
                <RadixDropdown.Item
                  key={model.id}
                  onSelect={() => onChange(model.id)}
                  className={cn(
                    'flex cursor-pointer flex-col gap-1 rounded-lg px-2.5 py-2 outline-none transition-colors',
                    'hover:bg-base-raised2 focus:bg-base-raised2',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {model.id === value && <Check size={13} className="text-gold" />}
                      {model.label}
                    </span>
                    <CapabilityIcons model={model} />
                  </div>
                  <span className="pl-0 text-xs leading-snug text-ink-muted">{model.description}</span>
                  <span className="mt-0.5 inline-flex w-fit items-center rounded-full border border-border bg-base-raised2/60 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                    Best for: {model.bestFor}
                  </span>
                </RadixDropdown.Item>
              ))}
            </div>
          ))}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}
