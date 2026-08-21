import { getDb, type ConversationRecord, type MessageRecord } from './index';
import type { ChatMessage } from '@/lib/ai/types';

function uid(): string {
  return crypto.randomUUID();
}

export function newConversationId(): string {
  return uid();
}

export function newMessageId(): string {
  return uid();
}

export async function createConversation(modelId: string, title = 'New conversation'): Promise<ConversationRecord> {
  const now = Date.now();
  const record: ConversationRecord = {
    id: newConversationId(),
    title,
    modelId,
    createdAt: now,
    updatedAt: now,
    archived: false,
    pinned: false,
  };
  await getDb().conversations.add(record);
  return record;
}

export async function listConversations(includeArchived = false): Promise<ConversationRecord[]> {
  const all = await getDb().conversations.orderBy('updatedAt').reverse().toArray();
  return includeArchived ? all : all.filter((c) => !c.archived);
}

export async function listArchivedConversations(): Promise<ConversationRecord[]> {
  const all = await getDb().conversations.orderBy('updatedAt').reverse().toArray();
  return all.filter((c) => c.archived);
}

export async function renameConversation(id: string, title: string): Promise<void> {
  await getDb().conversations.update(id, { title, updatedAt: Date.now() });
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  await getDb().conversations.update(id, { archived, updatedAt: Date.now() });
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  await getDb().conversations.update(id, { pinned });
}

export async function deleteConversation(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.conversations, db.messages, async () => {
    await db.conversations.delete(id);
    await db.messages.where('conversationId').equals(id).delete();
  });
}

export async function touchConversation(id: string): Promise<void> {
  await getDb().conversations.update(id, { updatedAt: Date.now() });
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const rows = await getDb().messages.where('conversationId').equals(conversationId).sortBy('createdAt');
  return rows;
}

export async function saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
  const record: MessageRecord = { ...message, conversationId };
  await getDb().messages.put(record);
  await touchConversation(conversationId);
}

export async function deleteMessage(id: string): Promise<void> {
  await getDb().messages.delete(id);
}

export async function deleteMessagesAfter(conversationId: string, afterCreatedAt: number): Promise<void> {
  const rows = await getDb()
    .messages.where('conversationId')
    .equals(conversationId)
    .filter((m) => m.createdAt > afterCreatedAt)
    .toArray();
  await getDb().messages.bulkDelete(rows.map((r) => r.id));
}

export interface SearchResult {
  conversation: ConversationRecord;
  snippet: string;
}

export async function searchConversations(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const db = getDb();
  const [conversations, messages] = await Promise.all([db.conversations.toArray(), db.messages.toArray()]);

  const results = new Map<string, SearchResult>();

  for (const c of conversations) {
    if (c.title.toLowerCase().includes(q)) {
      results.set(c.id, { conversation: c, snippet: c.title });
    }
  }
  for (const m of messages) {
    if (results.has(m.conversationId)) continue;
    if (m.content.toLowerCase().includes(q)) {
      const conv = conversations.find((c) => c.id === m.conversationId);
      if (!conv) continue;
      const idx = m.content.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 40);
      const snippet = (start > 0 ? '…' : '') + m.content.slice(start, idx + q.length + 40);
      results.set(conv.id, { conversation: conv, snippet });
    }
  }

  return Array.from(results.values()).sort((a, b) => b.conversation.updatedAt - a.conversation.updatedAt);
}
