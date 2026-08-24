'use client';

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { AlertTriangle, ArrowUp, Globe, ImagePlus, Mic, MicOff, Paperclip, Sparkles, Square, X } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { AttachmentPreview } from './AttachmentPreview';
import { getModel, modelSupports } from '@/lib/ai/models';
import type { ChatAttachment } from '@/lib/ai/types';
import { cn, formatContextWindow } from '@/lib/utils/cn';
import { DOCUMENT_EXTENSIONS, extractTextFromDocument } from '@/lib/attachments/extract-text';
import { useVoiceInput } from '@/lib/voice/use-voice-input';

interface Props {
  modelId: string;
  onModelChange: (id: string) => void;
  isGenerating: boolean;
  sendOnEnter: boolean;
  activeSkillCount: number;
  onSend: (content: string, attachments: ChatAttachment[], webSearch: boolean) => void;
  onGenerateImage: (prompt: string) => void;
  onStop: () => void;
  onOpenSkills: () => void;
}

function isDocumentFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return DOCUMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function Composer({
  modelId,
  onModelChange,
  isGenerating,
  sendOnEnter,
  activeSkillCount,
  onSend,
  onGenerateImage,
  onStop,
  onOpenSkills,
}: Props) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [attachError, setAttachError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const model = getModel(modelId);
  const acceptsImages = modelSupports(modelId, 'image-input');
  const supportsWebSearch = model?.provider === 'openrouter';

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, []);

  const { isSupported: voiceSupported, listening, interimText, start: startListening, stop: stopListening } =
    useVoiceInput((finalChunk) => {
      setText((prev) => (prev ? `${prev} ${finalChunk}` : finalChunk));
      requestAnimationFrame(resize);
    });

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setAttachError(null);
      for (const file of Array.from(files)) {
        if (isDocumentFile(file)) {
          setProcessingCount((n) => n + 1);
          try {
            const { text: extractedText, truncated, pageCount } = await extractTextFromDocument(file);
            setAttachments((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                name: file.name,
                mimeType: file.type || 'text/plain',
                dataUrl: '',
                kind: 'document',
                extractedText,
                extractedTextTruncated: truncated,
              },
            ]);
            void pageCount;
          } catch (err) {
            setAttachError(err instanceof Error ? err.message : `Couldn't read ${file.name}.`);
          } finally {
            setProcessingCount((n) => n - 1);
          }
        } else if (file.type.startsWith('image/') && acceptsImages) {
          const dataUrl = await readAsDataUrl(file);
          setAttachments((prev) => [
            ...prev,
            { id: crypto.randomUUID(), name: file.name, mimeType: file.type, dataUrl, kind: 'image' },
          ]);
        } else if (file.type.startsWith('image/')) {
          setAttachError(`${model?.label ?? 'This model'} doesn\u2019t accept images \u2014 try a multimodal model.`);
        } else {
          setAttachError(`MAAR can't read .${file.name.split('.').pop()} files yet.`);
        }
      }
    },
    [acceptsImages, model],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isGenerating || processingCount > 0) return;
    if (listening) stopListening();

    if (imageMode) {
      if (!trimmed) return;
      onGenerateImage(trimmed);
    } else {
      onSend(trimmed, attachments, webSearch && supportsWebSearch);
    }

    setText('');
    setAttachments([]);
    requestAnimationFrame(resize);
  }, [
    text,
    attachments,
    isGenerating,
    processingCount,
    imageMode,
    webSearch,
    supportsWebSearch,
    listening,
    stopListening,
    onSend,
    onGenerateImage,
    resize,
  ]);

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

  const fileAcceptList = [...DOCUMENT_EXTENSIONS, ...(acceptsImages ? ['image/*'] : [])].join(',');

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
        <div className="flex flex-wrap items-center justify-between gap-y-1.5 border-b border-border/70 px-3 py-2">
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
              {formatContextWindow(model.capabilities.contextWindow)} token context
            </span>
          )}
          {activeSkillCount > 0 && !imageMode && (
            <button
              type="button"
              onClick={onOpenSkills}
              title={`${activeSkillCount} skill${activeSkillCount === 1 ? '' : 's'} active — click to manage`}
              className="flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold transition-colors hover:bg-gold/15"
            >
              <Sparkles size={11} />
              {activeSkillCount}
            </button>
          )}
          {!imageMode && supportsWebSearch && (
            <button
              type="button"
              onClick={() => setWebSearch((v) => !v)}
              title={
                webSearch
                  ? 'Web search is on — MAAR can look things up before answering (uses extra OpenRouter credits)'
                  : 'Let MAAR search the web before answering (uses extra OpenRouter credits)'
              }
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                webSearch
                  ? 'border-ice/50 bg-ice/10 text-ice hover:bg-ice/15'
                  : 'border-border text-ink-muted hover:border-border-strong hover:text-ink',
              )}
            >
              <Globe size={12} />
              Search
            </button>
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

        {processingCount > 0 && !imageMode && (
          <p className="px-3 pt-2 text-xs text-ink-faint">Reading {processingCount} file{processingCount === 1 ? '' : 's'}…</p>
        )}
        {attachError && !imageMode && (
          <p className="flex items-center gap-1.5 px-3 pt-2 text-xs text-danger">
            <AlertTriangle size={12} /> {attachError}
          </p>
        )}
        {listening && (
          <p className="flex items-center gap-1.5 px-3 pt-2 text-xs text-gold">
            <Mic size={12} className="animate-pulse" /> Listening… {interimText}
          </p>
        )}

        <div className="flex items-end gap-2 px-3 py-3">
          {!imageMode && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach a document or image"
                className="mb-1 shrink-0 rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-raised2 hover:text-ink"
                aria-label="Attach a file"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={fileAcceptList}
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

          {!imageMode && voiceSupported && (
            <button
              type="button"
              onClick={() => (listening ? stopListening() : startListening())}
              title={listening ? 'Stop voice input' : 'Speak instead of typing'}
              className={cn(
                'mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                listening ? 'bg-danger/15 text-danger' : 'text-ink-muted hover:bg-base-raised2 hover:text-ink',
              )}
              aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

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
              disabled={(!text.trim() && attachments.length === 0) || processingCount > 0}
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
