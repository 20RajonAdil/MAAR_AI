import { getDb, type SkillRecord } from './index';

/**
 * "Skills" are text files the person uploads or imports (instructions, a
 * style guide, domain notes, a reference script for the model to *read*).
 * MAAR never executes anything from a skill file — its content is only
 * ever sent to the model as a system message, exactly like typing custom
 * instructions yourself. This is a deliberate scope boundary: running
 * arbitrary code from an uploaded file would be a serious security risk,
 * so that is not what this feature does, even for file types like .py or
 * .sh that MAAR accepts as readable text.
 */

export const MAX_SKILL_FILE_BYTES = 200_000; // ~200KB of text is already a lot of context
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
