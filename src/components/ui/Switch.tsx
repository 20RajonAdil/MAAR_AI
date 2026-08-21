'use client';

import * as RadixSwitch from '@radix-ui/react-switch';

interface Props {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id?: string;
}

export function Switch({ checked, onCheckedChange, label, id }: Props) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="relative h-6 w-11 shrink-0 rounded-full bg-base-raised2 border border-border transition-colors data-[state=checked]:bg-gold data-[state=checked]:border-gold"
    >
      <RadixSwitch.Thumb className="block h-4 w-4 translate-x-1 rounded-full bg-ink-faint transition-transform duration-150 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-[#12100A]" />
    </RadixSwitch.Root>
  );
}
