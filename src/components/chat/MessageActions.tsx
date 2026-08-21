'use client';

import { useState } from 'react';
import { Check, Copy, Pencil, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  onEdit?: () => void;
  onRegenerate?: () => void;
  className?: string;
}

export function MessageActions({ role, content, onEdit, onRegenerate, className }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
        className,
      )}
    >
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy message"
        className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-base-raised2 hover:text-ink"
      >
        {copied ? <Check size={14} className="text-ice" /> : <Copy size={14} />}
      </button>
      {role === 'user' && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit and resend"
          className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-base-raised2 hover:text-ink"
        >
          <Pencil size={14} />
        </button>
      )}
      {role === 'assistant' && onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          aria-label="Regenerate response"
          className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-base-raised2 hover:text-ink"
        >
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
}
