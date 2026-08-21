import { getDb, type ConversationRecord, type MessageRecord } from '@/lib/db';

export interface ExportedConversation {
  conversation: ConversationRecord;
  messages: MessageRecord[];
}

export interface MaarExportFile {
  format: 'maar-ai-export';
  version: 1;
  exportedAt: number;
  conversations: ExportedConversation[];
}

export async function exportAllConversationsJSON(): Promise<MaarExportFile> {
  const db = getDb();
  const conversations = await db.conversations.toArray();
  const messages = await db.messages.toArray();
  return {
    format: 'maar-ai-export',
    version: 1,
    exportedAt: Date.now(),
    conversations: conversations.map((conversation) => ({
      conversation,
      messages: messages.filter((m) => m.conversationId === conversation.id).sort((a, b) => a.createdAt - b.createdAt),
    })),
  };
}

export function conversationToMarkdown(exported: ExportedConversation): string {
  const { conversation, messages } = exported;
  const lines: string[] = [
    `# ${conversation.title}`,
    '',
    `_Model: ${conversation.modelId} · Exported from MAAR AI on ${new Date().toLocaleString()}_`,
    '',
    '---',
    '',
  ];
  for (const m of messages) {
    const label = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'MAAR' : 'System';
    lines.push(`**${label}**`, '', m.content, '');
  }
  return lines.join('\n');
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importConversationsJSON(file: MaarExportFile): Promise<number> {
  if (file.format !== 'maar-ai-export') {
    throw new Error('Unrecognized file format.');
  }
  const db = getDb();
  let imported = 0;
  await db.transaction('rw', db.conversations, db.messages, async () => {
    for (const { conversation, messages } of file.conversations) {
      const existing = await db.conversations.get(conversation.id);
      if (existing) continue; // never silently overwrite
      await db.conversations.add(conversation);
      await db.messages.bulkAdd(messages);
      imported += 1;
    }
  });
  return imported;
}
