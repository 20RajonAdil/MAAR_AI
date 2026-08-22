import { getDb } from './index';

export interface MaarSettings {
  theme: 'light' | 'dark' | 'system';
  defaultModelId: string;
  reduceMotion: boolean;
  backgroundEnabled: boolean;
  backgroundOpacity: number; // 0-100
  backgroundBlur: number; // 0-40 (px)
  backgroundOverlay: number; // 0-100, darkness of the scrim over the image
  sendOnEnter: boolean;
}

export const DEFAULT_SETTINGS: MaarSettings = {
  theme: 'system',
  defaultModelId: 'deepseek-ai/deepseek-v4-flash',
  reduceMotion: false,
  backgroundEnabled: true,
  backgroundOpacity: 55,
  backgroundBlur: 0,
  backgroundOverlay: 45,
  sendOnEnter: true,
};

const SETTINGS_KEY = 'maar-settings';

export async function loadSettings(): Promise<MaarSettings> {
  const row = await getDb().settings.get(SETTINGS_KEY);
  if (!row) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(row.value as Partial<MaarSettings>) };
}

export async function saveSettings(settings: MaarSettings): Promise<void> {
  await getDb().settings.put({ key: SETTINGS_KEY, value: settings });
}

export async function estimateStorageUsage(): Promise<{ usageBytes: number; quotaBytes: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return { usageBytes: usage ?? 0, quotaBytes: quota ?? 0 };
}

export async function clearAllLocalData(): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.conversations, db.messages, db.settings, db.skills, async () => {
    await db.conversations.clear();
    await db.messages.clear();
    await db.settings.clear();
    await db.skills.clear();
  });
}
