'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Sparkles, Trash2, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import {
  addSkillFromFile,
  deleteSkill,
  listSkills,
  setSkillEnabled,
  ALLOWED_SKILL_EXTENSIONS,
  MAX_SKILL_FILE_BYTES,
} from '@/lib/db/skills';
import type { SkillRecord } from '@/lib/db';

export function SkillsPanel() {
  const [skills, setSkills] = useState<SkillRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => listSkills().then(setSkills);

  useEffect(() => {
    refresh();
  }, []);

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      await addSkillFromFile(file);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that skill.');
    } finally {
      setUploading(false);
    }
  };

  const activeCount = skills?.filter((s) => s.enabled).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2.5 rounded-xl border border-border bg-base-raised2/40 p-3.5">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-gold" />
        <div className="text-xs leading-relaxed text-ink-muted">
          <p className="mb-1.5 text-sm text-ink">What a skill does</p>
          Upload a plain-text (.md or .txt) file with instructions, a style guide, or domain
          knowledge. Enabled skills are sent to the model as extra instructions on every message —
          nothing is ever executed. Skills stay local, like everything else in MAAR.
        </div>
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_SKILL_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-4 py-4 text-sm text-ink-muted transition-colors hover:border-gold/50 hover:text-ink disabled:opacity-50"
        >
          <Upload size={15} />
          {uploading ? 'Adding skill…' : 'Upload a skill file (.md or .txt)'}
        </button>
        <p className="mt-1.5 text-[11px] text-ink-faint">
          Capped at {Math.round(MAX_SKILL_FILE_BYTES / 1024)}KB per file so a skill can&rsquo;t crowd out
          the rest of your conversation&rsquo;s context window.
        </p>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>

      {skills && skills.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-ink">Your skills</p>
            <span className="text-xs text-ink-faint">
              {activeCount} active
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {skills.map((skill) => (
              <li
                key={skill.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-base-raised2/40 p-3"
              >
                <FileText size={16} className="mt-0.5 shrink-0 text-ink-faint" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{skill.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-faint">{skill.content}</p>
                  <p className="mt-1 text-[10px] text-ink-faint">
                    {Math.round(skill.sizeBytes / 1024)}KB · added {new Date(skill.createdAt).toLocaleDateString()}
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
        <p className="text-center text-xs text-ink-faint">No skills uploaded yet.</p>
      )}
    </div>
  );
}
