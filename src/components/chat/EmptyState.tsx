'use client';

import { Code2, ImageIcon, Lightbulb, MessageCircleQuestion, Sparkles, Wrench } from 'lucide-react';

interface Props {
  onSuggestion: (prompt: string) => void;
}

const SUGGESTIONS = [
  {
    icon: Code2,
    label: 'Write code',
    prompt: 'Help me write a function that debounces rapid user input in TypeScript.',
  },
  {
    icon: MessageCircleQuestion,
    label: 'Explain something',
    prompt: 'Explain how transformer attention works, in plain language.',
  },
  {
    icon: ImageIcon,
    label: 'Analyse an image',
    prompt: 'Attach an image using the paperclip and ask MAAR to describe or analyse it.',
  },
  {
    icon: Lightbulb,
    label: 'Brainstorm',
    prompt: 'Brainstorm five unconventional names for a local-first note-taking app.',
  },
  {
    icon: Wrench,
    label: 'Solve a problem',
    prompt: 'Walk me through debugging a memory leak in a long-running Node.js service.',
  },
  {
    icon: Sparkles,
    label: 'Learn something',
    prompt: 'Teach me the core ideas behind CAP theorem with a real-world analogy.',
  },
];

export function EmptyState({ onSuggestion }: Props) {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="rounded-2xl border border-border/60 bg-base/55 px-6 py-7 shadow-panel backdrop-blur-md sm:px-10 sm:py-8">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-seam rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-ink-faint">Local-first workspace</span>
        </div>

        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Ask MAAR anything
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
          A private AI workspace. Your conversations stay on this device.
        </p>
      </div>

      <div className="mt-9 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3">
        {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            type="button"
            onClick={() => onSuggestion(prompt)}
            className="group flex flex-col items-start gap-2.5 rounded-xl2 border border-border bg-base-raised/60 p-3.5 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:bg-base-raised"
          >
            <Icon size={16} className="text-gold transition-transform group-hover:scale-110" />
            <span className="text-xs font-medium text-ink sm:text-sm">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
