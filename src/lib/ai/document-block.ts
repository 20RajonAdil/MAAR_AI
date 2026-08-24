import type { ChatAttachment } from './types';

/**
 * Turns any 'document' attachments on a message into a clearly-delimited
 * text block appended to the outgoing content. This is what lets MAAR
 * "read" a PDF/DOCX/text file with *any* model — the content was already
 * extracted to plain text client-side, so it works the same way whether
 * the model has native file support or not.
 *
 * Only affects what's sent to the provider; the message as displayed and
 * stored in IndexedDB keeps the person's original, shorter text.
 */
export function appendDocumentBlocks(content: string, attachments?: ChatAttachment[]): string {
  const documents = (attachments ?? []).filter((a) => a.kind === 'document' && a.extractedText);
  if (documents.length === 0) return content;

  const blocks = documents.map((doc) => {
    const truncationNote = doc.extractedTextTruncated
      ? '\n\n[Note: this document was long and has been truncated.]'
      : '';
    return `<document name="${doc.name}">\n${doc.extractedText}${truncationNote}\n</document>`;
  });

  return `${content}\n\n${blocks.join('\n\n')}`;
}
