'use client';

/**
 * Extracts plain text from an uploaded document, entirely in the browser
 * — the file's bytes never leave the device except as the extracted text
 * that ends up in the chat message itself. This is what lets MAAR "read"
 * a document with *any* selected model, not just ones with native file
 * upload support: the text is folded into the message content before it
 * ever reaches a provider.
 */

export const MAX_DOCUMENT_CHARS = 50_000; // roughly 12-15k tokens — generous but bounded

export const DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.csv', '.json', '.log', '.yaml', '.yml'];

const PLAIN_TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.json', '.log', '.yaml', '.yml'];

export interface ExtractedDocument {
  text: string;
  truncated: boolean;
  pageCount?: number;
}

function truncate(text: string): ExtractedDocument {
  if (text.length <= MAX_DOCUMENT_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_DOCUMENT_CHARS), truncated: true };
}

async function extractFromPdf(file: File): Promise<ExtractedDocument> {
  const pdfjsLib = await import('pdfjs-dist');
  // Served as a plain static file (public/pdf.worker.min.mjs) rather than
  // resolved via new URL(...) — letting webpack bundle/minify this file
  // fails, because Next.js's Terser step chokes on the worker's ESM
  // import/export syntax. This sidesteps the bundler entirely.
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pageTexts: string[] = [];
  let charCount = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    if (charCount > MAX_DOCUMENT_CHARS) break; // stop extracting once we're already over the cap
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ');
    pageTexts.push(pageText);
    charCount += pageText.length;
  }

  const result = truncate(pageTexts.join('\n\n'));
  return { ...result, pageCount: doc.numPages };
}

async function extractFromDocx(file: File): Promise<ExtractedDocument> {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  return truncate(value);
}

async function extractFromPlainText(file: File): Promise<ExtractedDocument> {
  const text = await file.text();
  return truncate(text);
}

export async function extractTextFromDocument(file: File): Promise<ExtractedDocument> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.pdf')) return extractFromPdf(file);
  if (lowerName.endsWith('.docx')) return extractFromDocx(file);
  if (PLAIN_TEXT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) return extractFromPlainText(file);

  throw new Error(
    `MAAR can't read that file type yet. Supported documents: ${DOCUMENT_EXTENSIONS.join(', ')}.`,
  );
}
