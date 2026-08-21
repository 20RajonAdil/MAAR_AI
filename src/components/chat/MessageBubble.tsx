'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle } from 'lucide-react';
import type { ChatMessage } from '@/lib/ai/types';
import { CodeBlock } from './CodeBlock';
import { ThinkingIndicator } from './ThinkingIndicator';
import { MessageActions } from './MessageActions';
import { AttachmentPreview } from './AttachmentPreview';
import { cn } from '@/lib/utils/cn';

interface Props {
  message: ChatMessage;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
}

export function MessageBubble({ message, onEdit, onRegenerate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const isUser = message.role === 'user';

  if (editing) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-2">
        <div className="ml-auto max-w-[85%] rounded-xl2 border border-gold/50 bg-base-raised p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
            className="w-full resize-none bg-transparent text-[15px] text-ink focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-ink-muted hover:bg-base-raised2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                onEdit?.(draft);
              }}
              className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-[#12100A]"
            >
              Save &amp; resend
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group mx-auto w-full max-w-3xl px-4 py-2 animate-rise-in">
      <div className={cn('flex flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'max-w-[85%] rounded-xl2 px-4 py-2.5',
            isUser
              ? 'bg-base-raised2 border border-border text-ink'
              : 'bg-transparent text-ink',
          )}
        >
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2">
              <AttachmentPreview attachments={message.attachments} />
            </div>
          )}

          {message.error ? (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{message.error}</span>
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
          ) : (
            <div className="maar-prose">
              {message.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const isBlock = /language-/.test(className ?? '');
                      if (!isBlock) {
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                      return <CodeBlock className={className}>{String(children)}</CodeBlock>;
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : message.isStreaming ? (
                <ThinkingIndicator />
              ) : null}
            </div>
          )}

          {message.stopped && (
            <p className="mt-1 text-xs italic text-ink-faint">Generation stopped</p>
          )}
        </div>

        {!message.isStreaming && !message.error && (message.content || message.attachments?.length) && (
          <MessageActions
            role={message.role === 'system' ? 'assistant' : message.role}
            content={message.content}
            onEdit={isUser ? () => setEditing(true) : undefined}
            onRegenerate={!isUser ? onRegenerate : undefined}
          />
        )}
      </div>
    </div>
  );
}
