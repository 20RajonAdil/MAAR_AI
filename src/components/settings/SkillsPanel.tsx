'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileArchive, FileText, Github, Link2, Sparkles, Trash2, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import {
  addSkillFromFile,
  addSkillFromRemote,
  addSkillFromZip,
  deleteSkill,
  listSkills,
  setSkillEnabled,
  ALLOWED_SKILL_EXTENSIONS,
  MAX_SKILL_FILE_BYTES,
  MAX_ZIP_UPLOAD_BYTES,
} from '@/lib/db/skills';
import { importSkillFromUrl } from '@/lib/skills/import-client';
import type { SkillRecord } from '@/lib/db';
import { cn } from '@/lib/utils/cn';

type Source = 'file' | 'link';

export function SkillsPanel() {
  const [skills, setSkills] = useState<SkillRecord[] | null>(null);
  const [source, setSource] = useState<Source>('file');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => listSkills().then(setSkills);

  useEffect(() => {
    refresh();
  }, []);

  const handleUpload = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        await addSkillFromZip(file);
      } else {
        await addSkillFromFile(file);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that skill.');
    } finally {
      setBusy(false);
    }
  };

  const handleImportLink = async () => {
    const url = linkValue.trim();
    if (!url) return;
    setError(null);
    setBusy(true);
    try {
      const result = await importSkillFromUrl(url);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await addSkillFromRemote(result.name, result.content, result.sourceUrl);
      setLinkValue('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that skill.');
    } finally {
      setBusy(false);
    }
  };

  const activeCount = skills?.filter((s) => s.enabled).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2.5 rounded-xl border border-border bg-base-raised2/40 p-3.5">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-gold" />
        <div className="text-xs leading-relaxed text-ink-muted">
          <p className="mb-1.5 text-sm text-ink">What a skill does</p>
          Add a text file, a .zip of a whole skill folder, or a GitHub link — instructions, a style
          guide, domain knowledge, reference files. Enabled skills are sent to the model as extra
          instructions on every message. MAAR reads the text; it never executes anything from a skill
          file, even code files or scripts inside a zip. Skills stay local, like everything else in
          MAAR.
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-base-raised2/30 p-1">
        <button
          type="button"
          onClick={() => setSource('file')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
            source === 'file' ? 'bg-base-raised text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
          )}
        >
          <Upload size={13} /> Upload a file
        </button>
        <button
          type="button"
          onClick={() => setSource('link')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
            source === 'link' ? 'bg-base-raised text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
          )}
        >
          <Github size={13} /> Add from GitHub
        </button>
      </div>

      {source === 'file' ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={[...ALLOWED_SKILL_EXTENSIONS, '.zip'].join(',')}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-4 py-4 text-sm text-ink-muted transition-colors hover:border-gold/50 hover:text-ink disabled:opacity-50"
          >
            <Upload size={15} />
            {busy ? 'Adding skill…' : 'Choose a file or .zip folder'}
          </button>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            Single text files ({ALLOWED_SKILL_EXTENSIONS.slice(0, 5).join(', ')}, and more, capped at{' '}
            {Math.round(MAX_SKILL_FILE_BYTES / 1024)}KB), or a{' '}
            <strong className="font-medium text-ink-muted">.zip</strong> of a whole skill folder — like a real
            Claude Skill with a SKILL.md plus reference files (zip capped at{' '}
            {Math.round(MAX_ZIP_UPLOAD_BYTES / 1024 / 1024)}MB; only text files inside are read, everything
            else is skipped).
          </p>
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-base-raised2/40 px-3 py-2">
              <Link2 size={14} className="shrink-0 text-ink-faint" />
              <input
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleImportLink()}
                placeholder="https://github.com/owner/repo or a direct file link"
                aria-label="GitHub URL to import as a skill"
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleImportLink}
              disabled={busy || !linkValue.trim()}
              className="shrink-0 rounded-lg bg-gold px-4 text-sm font-medium text-[#12100A] transition-transform hover:brightness-95 disabled:opacity-40"
            >
              {busy ? 'Importing…' : 'Import'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
            Paste a repo link (looks for <code className="rounded bg-base-raised2 px-1">SKILL.md</code> at the
            root), a folder link, or a direct/raw file link — direct file links are the most reliable since
            they don&rsquo;t use GitHub&rsquo;s rate-limited API. Public repos and gists only.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {skills && skills.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-ink">Your skills</p>
            <span className="text-xs text-ink-faint">{activeCount} active</span>
          </div>
          <ul className="flex flex-col gap-2">
            {skills.map((skill) => (
              <li
                key={skill.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-base-raised2/40 p-3"
              >
                {skill.sourceUrl ? (
                  <Github size={16} className="mt-0.5 shrink-0 text-ink-faint" />
                ) : skill.sourceFileName.toLowerCase().endsWith('.zip') ? (
                  <FileArchive size={16} className="mt-0.5 shrink-0 text-ink-faint" />
                ) : (
                  <FileText size={16} className="mt-0.5 shrink-0 text-ink-faint" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{skill.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-faint">{skill.content}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-faint">
                    {Math.round(skill.sizeBytes / 1024)}KB · added {new Date(skill.createdAt).toLocaleDateString()}
                    {skill.sourceUrl && (
                      <a
                        href={skill.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 inline-flex items-center gap-0.5 text-ice hover:underline"
                      >
                        source <ExternalLink size={9} />
                      </a>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Switch
                    checked={skill.enabled}
                    onCheckedChange={async (checked) => {
                      await setSkillEnabled(skill.id, checked);
                      refresh();
                    }}
                    label={`Enable ${skill.name}`}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteSkill(skill.id);
                      refresh();
                    }}
                    className="rounded-md p-1 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label={`Delete ${skill.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {skills && skills.length === 0 && (
        <p className="text-center text-xs text-ink-faint">No skills added yet.</p>
      )}
    </div>
  );
}
