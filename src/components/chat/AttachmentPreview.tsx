'use client';

import { File as FileIcon, FileText, Music, Video, X } from 'lucide-react';
import type { ChatAttachment } from '@/lib/ai/types';

interface Props {
  attachments: ChatAttachment[];
  onRemove?: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: Props) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((a) => (
        <div
          key={a.id}
          className="group relative flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-base-raised2 pr-2"
        >
          {a.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.dataUrl} alt={a.name} className="h-12 w-12 object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center text-ink-muted">
              {a.kind === 'audio' && <Music size={18} />}
              {a.kind === 'video' && <Video size={18} />}
              {a.kind === 'file' && <FileIcon size={18} />}
              {a.kind === 'document' && <FileText size={18} />}
            </div>
          )}
          <div className="max-w-[9rem] py-1.5">
            <p className="truncate text-xs text-ink-muted">{a.name}</p>
            {a.kind === 'document' && a.extractedText && (
              <p className="truncate text-[10px] text-ink-faint">
                {a.extractedText.length.toLocaleString()} chars read
                {a.extractedTextTruncated ? ' (truncated)' : ''}
              </p>
            )}
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(a.id)}
              className="ml-1 rounded-full p-0.5 text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              aria-label={`Remove ${a.name}`}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
