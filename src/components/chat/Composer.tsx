'use client';

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { ArrowUp, ImagePlus, Paperclip, Square, X } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { AttachmentPreview } from './AttachmentPreview';
import { getModel, modelSupports } from '@/lib/ai/models';
import type { ChatAttachment } from '@/lib/ai/types';
import { cn } from '@/lib/utils/cn';

interface Props {
  modelId: string;
  onModelChange: (id: string) => void;
  isGenerating: boolean;
  sendOnEnter: boolean;
  onSend: (content: string, attachments: ChatAttachment[]) => void;
  onGenerateImage: (prompt: string) => void;
  onStop: () => void;
}

function kindForMime(mime: string): ChatAttachment['kind'] {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
}

export function Composer({
  modelId,
  onModelChange,
  isGenerating,
  sendOnEnter,
  onSend,
  onGenerateImage,
  onStop,
}: Props) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const model = getModel(modelId);
  const acceptsImages = modelSupports(modelId, 'image-input');

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: file.name,
            mimeType: file.type,
            dataUrl: reader.result as string,
            kind: kindForMime(file.type),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isGenerating) return;

    if (imageMode) {
      if (!trimmed) return;
      onGenerateImage(trimmed);
    } else {
      onSend(trimmed, attachments);
    }

    setText('');
    setAttachments([]);
    requestAnimationFrame(resize);
  }, [text, attachments, isGenerating, imageMode, onSend, onGenerateImage, resize]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && sendOnEnter) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (!imageMode && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!imageMode) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-xl2 border bg-base-raised/90 backdrop-blur-md shadow-panel transition-colors',
          dragOver ? 'border-gold' : imageMode ? 'border-ice/50' : 'border-border',
        )}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
          {imageMode ? (
            <span className="flex items-center gap-2 text-sm font-medium text-ice">
              <ImagePlus size={15} />
              Generating an image
            </span>
          ) : (
            <ModelSelector value={modelId} onChange={onModelChange} />
          )}
          {model && !imageMode && (
            <span className="hidden text-xs text-ink-faint sm:inline">
              {model.capabilities.contextWindow.toLocaleString()} token context
            </span>
          )}
          <button
            type="button"
            onClick={() => setImageMode((v) => !v)}
            disabled={isGenerating}
            title={imageMode ? 'Switch back to chat' : 'Generate an image instead'}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40',
              imageMode
                ? 'border-ice/50 bg-ice/10 text-ice hover:bg-ice/15'
                : 'border-border text-ink-muted hover:border-border-strong hover:text-ink',
            )}
          >
            {imageMode ? (
              <>
                <X size={13} /> Cancel
              </>
            ) : (
              <>
                <ImagePlus size={13} /> Image
              </>
            )}
          </button>
        </div>

        {attachments.length > 0 && !imageMode && (
          <div className="px-3 pt-3">
            <AttachmentPreview
              attachments={attachments}
              onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
            />
          </div>
        )}

        <div className="flex items-end gap-2 px-3 py-3">
          {!imageMode && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!acceptsImages}
                title={acceptsImages ? 'Attach a file' : `${model?.label ?? 'This model'} doesn’t accept attachments`}
                className="mb-1 shrink-0 rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-raised2 hover:text-ink disabled:opacity-30"
                aria-label="Attach a file"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
              />
            </>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              resize();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={imageMode ? 'Describe the image you want to generate…' : 'Ask MAAR anything…'}
            aria-label={imageMode ? 'Describe the image to generate' : 'Message MAAR'}
            className="max-h-60 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-base-raised2 text-ink transition-colors hover:bg-danger/20 hover:text-danger"
              aria-label="Stop generating"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() && attachments.length === 0}
              className={cn(
                'mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#12100A] transition-transform hover:brightness-95 disabled:opacity-30 disabled:hover:brightness-100',
                imageMode ? 'bg-ice' : 'bg-gold',
              )}
              aria-label={imageMode ? 'Generate image' : 'Send message'}
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-faint">
        {imageMode
          ? 'Gemini 2.5 Flash Image via OpenRouter · Enter to generate'
          : `${sendOnEnter ? 'Enter to send · Shift+Enter for a new line' : 'Shift+Enter or the button to send'} · Conversations stay on this device`}
      </p>
    </div>
  );
}
