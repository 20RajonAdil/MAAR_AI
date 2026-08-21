'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, Download, ShieldCheck, Upload } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { StorageInfo } from './StorageInfo';
import type { MaarSettings } from '@/lib/db/settings';
import { clearAllLocalData } from '@/lib/db/settings';
import { exportAllConversationsJSON, downloadFile, importConversationsJSON, type MaarExportFile } from '@/lib/utils/export';
import { MODELS } from '@/lib/ai/models';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: MaarSettings;
  onUpdate: (patch: Partial<MaarSettings>) => void;
  onDataCleared: () => void;
}

type Tab = 'general' | 'appearance' | 'privacy';

export function SettingsPanel({ open, onOpenChange, settings, onUpdate, onDataCleared }: Props) {
  const [tab, setTab] = useState<Tab>('general');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleExportJSON = async () => {
    const data = await exportAllConversationsJSON();
    downloadFile(`maar-ai-export-${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json');
  };

  const handleExportMarkdown = async () => {
    const data = await exportAllConversationsJSON();
    const { conversationToMarkdown } = await import('@/lib/utils/export');
    const combined = data.conversations.map(conversationToMarkdown).join('\n\n---\n\n');
    downloadFile(`maar-ai-export-${Date.now()}.md`, combined, 'text/markdown');
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as MaarExportFile;
      const count = await importConversationsJSON(parsed);
      setImportMessage(`Imported ${count} conversation${count === 1 ? '' : 's'}.`);
    } catch {
      setImportMessage('That file couldn’t be imported — make sure it’s a MAAR AI export.');
    }
  };

  const handleClear = async () => {
    await clearAllLocalData();
    setConfirmClear(false);
    onOpenChange(false);
    onDataCleared();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Settings" description="Everything here is stored locally in your browser.">
      <div className="mb-4 flex gap-1 border-b border-border">
        {(['general', 'appearance', 'privacy'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 pb-2 text-sm capitalize transition-colors ${
              tab === t ? 'border-gold text-ink' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="default-model" className="mb-1.5 block text-sm text-ink">
              Default model
            </label>
            <select
              id="default-model"
              value={settings.defaultModelId}
              onChange={(e) => onUpdate({ defaultModelId: e.target.value })}
              className="w-full rounded-lg border border-border bg-base-raised2 px-3 py-2 text-sm text-ink focus:outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">Send on Enter</p>
              <p className="text-xs text-ink-faint">Shift+Enter always inserts a new line.</p>
            </div>
            <Switch checked={settings.sendOnEnter} onCheckedChange={(v) => onUpdate({ sendOnEnter: v })} label="Send on Enter" />
          </div>

          <div>
            <p className="mb-2 text-sm text-ink">Export conversations</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleExportJSON}>
                <Download size={13} /> JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportMarkdown}>
                <Download size={13} /> Markdown
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-ink">Import conversations</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
            />
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={13} /> Import JSON export
            </Button>
            {importMessage && <p className="mt-2 text-xs text-ink-muted">{importMessage}</p>}
          </div>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-1.5 text-sm text-ink">Theme</p>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdate({ theme: t })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs capitalize transition-colors ${
                    settings.theme === t
                      ? 'border-gold bg-gold/10 text-ink'
                      : 'border-border text-ink-muted hover:border-border-strong'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">Reduce motion</p>
              <p className="text-xs text-ink-faint">Minimizes decorative animation throughout MAAR.</p>
            </div>
            <Switch checked={settings.reduceMotion} onCheckedChange={(v) => onUpdate({ reduceMotion: v })} label="Reduce motion" />
          </div>

          <div className="rounded-xl border border-border bg-base-raised2/40 p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-ink">Background image</p>
              <Switch
                checked={settings.backgroundEnabled}
                onCheckedChange={(v) => onUpdate({ backgroundEnabled: v })}
                label="Enable background image"
              />
            </div>
            {settings.backgroundEnabled && (
              <div className="flex flex-col gap-3.5">
                <Slider
                  label="Opacity"
                  value={settings.backgroundOpacity}
                  onValueChange={(v) => onUpdate({ backgroundOpacity: v })}
                />
                <Slider label="Blur" value={settings.backgroundBlur} max={40} suffix="px" onValueChange={(v) => onUpdate({ backgroundBlur: v })} />
                <Slider
                  label="Overlay darkness"
                  value={settings.backgroundOverlay}
                  onValueChange={(v) => onUpdate({ backgroundOverlay: v })}
                />
                <p className="text-[11px] leading-relaxed text-ink-faint">
                  Replace <code className="rounded bg-base-raised px-1">public/background.jpg</code> in the project to use
                  your own image — these controls keep working unchanged.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'privacy' && (
        <div className="flex flex-col gap-5">
          <div className="flex gap-2.5 rounded-xl border border-border bg-base-raised2/40 p-3.5">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ice" />
            <div className="text-xs leading-relaxed text-ink-muted">
              <p className="mb-1.5 text-sm text-ink">Where your data lives</p>
              Conversations, messages, and settings are stored only in this browser’s IndexedDB — there is no
              account and no cloud database. When you send a message, that message (and any attachment) is sent to
              NVIDIA’s API to generate a response; nothing else leaves your device. Clearing your browser data or
              using a different browser/device starts fresh.
            </div>
          </div>

          <StorageInfo />

          <div className="rounded-xl border border-danger/30 p-3.5">
            <div className="flex gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
              <div className="flex-1">
                <p className="text-sm text-ink">Clear all local data</p>
                <p className="mt-1 text-xs text-ink-faint">
                  Permanently deletes every conversation and setting from this browser. This cannot be undone —
                  export first if you want to keep a copy.
                </p>
                {!confirmClear ? (
                  <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirmClear(true)}>
                    Clear all data
                  </Button>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button variant="danger" size="sm" onClick={handleClear}>
                      Yes, delete everything
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setConfirmClear(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
