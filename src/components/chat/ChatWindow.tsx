'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/ai/types';
import { MessageBubble } from './MessageBubble';
import { EmptyState } from './EmptyState';

interface Props {
  messages: ChatMessage[];
  onSuggestion: (prompt: string) => void;
  onEditMessage: (id: string, newContent: string) => void;
  onRegenerate: (assistantId: string) => void;
}

export function ChatWindow({ messages, onSuggestion, onEditMessage, onRegenerate }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lastContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, lastContent]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <EmptyState onSuggestion={onSuggestion} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto" role="log" aria-live="polite" aria-relevant="additions">
      <div className="py-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onEdit={message.role === 'user' ? (content) => onEditMessage(message.id, content) : undefined}
            onRegenerate={message.role === 'assistant' ? () => onRegenerate(message.id) : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
