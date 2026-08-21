'use client';

import * as RadixSlider from '@radix-ui/react-slider';

interface Props {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  suffix?: string;
}

export function Slider({ value, onValueChange, min = 0, max = 100, step = 1, label, suffix = '%' }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono text-ink">{value}{suffix}</span>
      </div>
      <RadixSlider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        min={min}
        max={max}
        step={step}
        aria-label={label}
      >
        <RadixSlider.Track className="relative h-1.5 grow rounded-full bg-base-raised2 border border-border">
          <RadixSlider.Range className="absolute h-full rounded-full bg-gold" />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="block h-4 w-4 rounded-full border-2 border-gold bg-base-raised shadow focus-visible:outline-2 focus-visible:outline-gold" />
      </RadixSlider.Root>
    </div>
  );
}
