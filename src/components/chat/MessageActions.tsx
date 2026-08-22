'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Pencil, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  onEdit?: () => void;
  onRegenerate?: () => void;
  className?: string;
}

/** Strips the most common markdown syntax so read-aloud doesn't speak "asterisk asterisk". */
function toSpeechText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' code block omitted ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function MessageActions({ role, content, onEdit, onRegenerate, className }: Props) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // If the person navigates away or this message unmounts mid-speech, stop
  // rather than leaving a voice talking over a message that's no longer visible.
  useEffect(() => {
    return () => {
      if (speaking && canSpeak) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleReadAloud = () => {
    if (!canSpeak) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel(); // only one message reads at a time
    const utterance = new SpeechSynthesisUtterance(toSpeechText(content));
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
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
      {role === 'assistant' && canSpeak && content && (
        <button
          type="button"
          onClick={handleReadAloud}
          aria-label={speaking ? 'Stop reading aloud' : 'Read message aloud'}
          className={cn(
            'rounded-md p-1.5 transition-colors hover:bg-base-raised2',
            speaking ? 'text-gold' : 'text-ink-faint hover:text-ink',
          )}
        >
          {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      )}
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
