export function ThinkingIndicator({ label = 'Thinking' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm text-ink-muted" role="status" aria-live="polite">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-gold [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-gold [animation-delay:180ms]" />
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-gold [animation-delay:360ms]" />
      </span>
      <span>{label}&hellip;</span>
    </div>
  );
}
