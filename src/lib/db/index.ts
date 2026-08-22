import Dexie, { type Table } from 'dexie';
import type { ChatMessage } from '@/lib/ai/types';

export interface ConversationRecord {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  pinned: boolean;
}

export interface MessageRecord extends ChatMessage {
  conversationId: string;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export interface SkillRecord {
  id: string;
  name: string;
  /** Plain-text instructions, sent to the model as a system message when enabled. */
  content: string;
  sizeBytes: number;
  sourceFileName: string;
  enabled: boolean;
  createdAt: number;
}

/**
 * All MAAR AI data lives in this single IndexedDB database, entirely in
 * the user's browser. Nothing here is ever synced to a server — the only
 * network calls the app makes are the streaming completion requests to
 * /api/chat, which forwards to NVIDIA or OpenRouter.
 */
class MaarDatabase extends Dexie {
  conversations!: Table<ConversationRecord, string>;
  messages!: Table<MessageRecord, string>;
  settings!: Table<SettingRecord, string>;
  skills!: Table<SkillRecord, string>;

  constructor() {
    super('maar-ai');
    this.version(1).stores({
      conversations: 'id, updatedAt, archived, pinned',
      messages: 'id, conversationId, createdAt',
      settings: 'key',
    });
    this.version(2).stores({
      conversations: 'id, updatedAt, archived, pinned',
      messages: 'id, conversationId, createdAt',
      settings: 'key',
      skills: 'id, enabled, createdAt',
    });
  }
}

// Lazily instantiated so this module is safe to import from server
// components too (it simply won't be used there).
let _db: MaarDatabase | null = null;
export function getDb(): MaarDatabase {
  if (typeof window === 'undefined') {
    throw new Error('MAAR local database is only available in the browser.');
  }
  if (!_db) _db = new MaarDatabase();
  return _db;
}
