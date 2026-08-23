import JSZip from 'jszip';
import { getDb, type SkillRecord } from './index';

/**
 * "Skills" are text files the person uploads or imports (instructions, a
 * style guide, domain notes, a reference script for the model to *read*).
 * MAAR never executes anything from a skill file — its content is only
 * ever sent to the model as a system message, exactly like typing custom
 * instructions yourself. This is a deliberate scope boundary: running
 * arbitrary code from an uploaded file would be a serious security risk,
 * so that is not what this feature does, even for file types like .py or
 * .sh that MAAR accepts as readable text, and even for a .zip bundle that
 * looks like a real multi-file skill folder.
 */

export const MAX_SKILL_FILE_BYTES = 200_000; // ~200KB of text is already a lot of context
export const MAX_SKILL_BUNDLE_BYTES = 400_000; // a .zip can hold several files, so a slightly higher combined cap
export const MAX_ZIP_UPLOAD_BYTES = 5_000_000; // the .zip itself, before extraction — mostly compresses down
export const ALLOWED_SKILL_EXTENSIONS = [
  '.md',
  '.markdown',
  '.txt',
  '.json',
  '.yaml',
  '.yml',
  '.csv',
  '.py',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.sh',
  '.html',
  '.css',
  '.sql',
  '.rb',
  '.go',
  '.rs',
];

export interface SkillValidationError {
  code: 'unsupported-type' | 'too-large' | 'empty';
  message: string;
}

export function validateSkillFile(file: File): SkillValidationError | null {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_SKILL_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasAllowedExtension) {
    return {
      code: 'unsupported-type',
      message: `MAAR reads skills as text, not executables — try one of: ${ALLOWED_SKILL_EXTENSIONS.join(', ')}.`,
    };
  }
  if (file.size > MAX_SKILL_FILE_BYTES) {
    return {
      code: 'too-large',
      message: `That file is too large (${Math.round(file.size / 1024)}KB). Skills are capped at ${Math.round(
        MAX_SKILL_FILE_BYTES / 1024,
      )}KB so they don't crowd out the rest of the conversation's context window.`,
    };
  }
  return null;
}

export async function addSkillFromFile(file: File): Promise<SkillRecord> {
  const validationError = validateSkillFile(file);
  if (validationError) throw new Error(validationError.message);

  const content = await file.text();
  if (!content.trim()) throw new Error("That file is empty — there's nothing to teach MAAR.");
  if (content.includes('\u0000')) {
    throw new Error("That file doesn't look like text — MAAR only accepts plain-text skill files.");
  }

  const record: SkillRecord = {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.(md|markdown|txt)$/i, ''),
    content,
    sizeBytes: file.size,
    sourceFileName: file.name,
    enabled: true,
    createdAt: Date.now(),
  };
  await getDb().skills.add(record);
  return record;
}

export async function addSkillFromRemote(name: string, content: string, sourceUrl: string): Promise<SkillRecord> {
  if (!content.trim()) throw new Error("That file is empty — there's nothing to teach MAAR.");
  if (content.length > MAX_SKILL_FILE_BYTES) {
    throw new Error(
      `That file is too large (${Math.round(content.length / 1024)}KB). Skills are capped at ${Math.round(
        MAX_SKILL_FILE_BYTES / 1024,
      )}KB.`,
    );
  }

  const record: SkillRecord = {
    id: crypto.randomUUID(),
    name: name.replace(/\.(md|markdown|txt)$/i, ''),
    content,
    sizeBytes: content.length,
    sourceFileName: name,
    sourceUrl,
    enabled: true,
    createdAt: Date.now(),
  };
  await getDb().skills.add(record);
  return record;
}

const BINARY_LOOKING_NAME = /\.(png|jpe?g|gif|webp|svg|ico|bmp|pdf|zip|tar|gz|7z|rar|exe|dll|so|dylib|bin|mp3|mp4|wav|mov|avi|woff2?|ttf|otf|eot|pyc|class)$/i;

/**
 * Extracts a .zip into one combined skill, like uploading a real
 * multi-file skill folder (SKILL.md plus reference files). Only files
 * with an allowed text extension are read; everything else — images,
 * binaries, compiled artifacts, nested archives — is silently skipped,
 * never stored, never executed. A SKILL.md anywhere in the archive is
 * placed first in the combined content.
 */
export async function addSkillFromZip(file: File): Promise<SkillRecord> {
  if (file.size > MAX_ZIP_UPLOAD_BYTES) {
    throw new Error(
      `That zip is too large (${Math.round(file.size / 1024)}KB). Zipped skill bundles are capped at ${Math.round(
        MAX_ZIP_UPLOAD_BYTES / 1024,
      )}KB.`,
    );
  }

  const zip = await JSZip.loadAsync(file).catch(() => {
    throw new Error("That doesn't look like a valid .zip file.");
  });

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);

  // GitHub's "Download ZIP" wraps everything in a single "repo-branch/"
  // folder — strip that one common prefix so displayed paths read cleanly.
  const topLevelDirs = new Set(entries.map((e) => e.name.split('/')[0]));
  const commonPrefix = topLevelDirs.size === 1 && entries.every((e) => e.name.includes('/')) ? `${[...topLevelDirs][0]}/` : '';

  type Piece = { path: string; content: string };
  const pieces: Piece[] = [];
  let totalBytes = 0;

  for (const entry of entries) {
    const lowerName = entry.name.toLowerCase();
    if (BINARY_LOOKING_NAME.test(lowerName)) continue;
    const hasAllowedExtension = ALLOWED_SKILL_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasAllowedExtension) continue;

    const text = await entry.async('string');
    if (!text.trim() || text.includes('\u0000')) continue; // empty or binary-looking despite the extension
    if (text.length > MAX_SKILL_FILE_BYTES) continue; // one oversized file shouldn't crowd out the rest of the bundle

    const displayPath = entry.name.startsWith(commonPrefix) ? entry.name.slice(commonPrefix.length) : entry.name;
    pieces.push({ path: displayPath, content: text });
    totalBytes += text.length;
  }

  if (pieces.length === 0) {
    throw new Error("Couldn't find any readable text files in that zip — check it isn't just images or binaries.");
  }

  // SKILL.md (however deep) leads the combined content, like a real skill's entry point.
  pieces.sort((a, b) => {
    const aIsSkill = /(^|\/)skill\.md$/i.test(a.path) ? 0 : 1;
    const bIsSkill = /(^|\/)skill\.md$/i.test(b.path) ? 0 : 1;
    return aIsSkill - bIsSkill;
  });

  let combined = '';
  let truncated = false;
  for (const piece of pieces) {
    const block = `# File: ${piece.path}\n\n${piece.content}\n\n---\n\n`;
    if (combined.length + block.length > MAX_SKILL_BUNDLE_BYTES) {
      truncated = true;
      break;
    }
    combined += block;
  }

  const bundleName = file.name.replace(/\.zip$/i, '');
  const record: SkillRecord = {
    id: crypto.randomUUID(),
    name: bundleName,
    content: truncated
      ? `${combined}\n_(Some files from this bundle were omitted — it was larger than MAAR's ${Math.round(
          MAX_SKILL_BUNDLE_BYTES / 1024,
        )}KB combined limit.)_`
      : combined,
    sizeBytes: totalBytes,
    sourceFileName: file.name,
    enabled: true,
    createdAt: Date.now(),
  };
  await getDb().skills.add(record);
  return record;
}

export async function listSkills(): Promise<SkillRecord[]> {
  return getDb().skills.orderBy('createdAt').reverse().toArray();
}

export async function setSkillEnabled(id: string, enabled: boolean): Promise<void> {
  await getDb().skills.update(id, { enabled });
}

export async function renameSkill(id: string, name: string): Promise<void> {
  await getDb().skills.update(id, { name });
}

export async function deleteSkill(id: string): Promise<void> {
  await getDb().skills.delete(id);
}

/** Combines every enabled skill into one system-message string for the active request. */
export async function buildActiveSkillsSystemPrompt(): Promise<string | null> {
  const skills = (await getDb().skills.toArray()).filter((s) => s.enabled);
  if (skills.length === 0) return null;
  return skills.map((s) => `# Skill: ${s.name}\n\n${s.content}`).join('\n\n---\n\n');
}
