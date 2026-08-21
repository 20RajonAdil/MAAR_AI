'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, Download } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import { cn } from '@/lib/utils/cn';
import { registerHighlightLanguages } from '@/lib/highlight-languages';

registerHighlightLanguages(hljs);

interface Props {
  className?: string; // e.g. "language-tsx", passed by react-markdown
  children: string;
}

const COLLAPSE_LINE_THRESHOLD = 24;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightLine(line: string, language: string): string {
  if (!line) return '&nbsp;';
  try {
    if (hljs.getLanguage(language)) {
      return hljs.highlight(line, { language, ignoreIllegals: true }).value;
    }
  } catch {
    // fall through to plain escaping below
  }
  return escapeHtml(line);
}

const EXT_BY_LANG: Record<string, string> = {
  typescript: 'ts',
  tsx: 'tsx',
  javascript: 'js',
  jsx: 'jsx',
  python: 'py',
  bash: 'sh',
  shell: 'sh',
  json: 'json',
  css: 'css',
  html: 'html',
  markdown: 'md',
  sql: 'sql',
  yaml: 'yml',
  rust: 'rs',
  go: 'go',
};

export function CodeBlock({ className, children }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const language = (className ?? '').replace('language-', '') || 'text';
  const code = children.replace(/\n$/, '');
  const lines = useMemo(() => code.split('\n'), [code]);
  const isLong = lines.length > COLLAPSE_LINE_THRESHOLD;
  const visibleLines = expanded || !isLong ? lines : lines.slice(0, COLLAPSE_LINE_THRESHOLD);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const ext = EXT_BY_LANG[language] ?? 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maar-snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="not-prose my-3 overflow-hidden rounded-xl border border-border bg-[#0A0C11]">
      <div className="flex items-center justify-between border-b border-border bg-base-raised2 px-3 py-1.5">
        <span className="font-mono text-xs text-ink-faint">{language}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-base-raised hover:text-ink"
            aria-label="Download snippet"
          >
            <Download size={13} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-base-raised hover:text-ink"
            aria-label="Copy code"
          >
            {copied ? <Check size={13} className="text-ice" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px] leading-6">
          <tbody>
            {visibleLines.map((line, i) => (
              <tr key={i} className="hover:bg-white/[0.02]">
                <td className="select-none border-r border-border/60 px-3 text-right font-mono text-ink-faint/70" style={{ width: '1%' }}>
                  {i + 1}
                </td>
                <td
                  className="hljs-line whitespace-pre px-3 font-mono text-ink"
                  dangerouslySetInnerHTML={{ __html: highlightLine(line, language) }}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            'flex w-full items-center justify-center gap-1.5 border-t border-border py-2 text-xs text-ink-muted',
            'transition-colors hover:bg-base-raised2 hover:text-ink',
          )}
        >
          {expanded ? (
            <>
              <ChevronUp size={13} /> Collapse
            </>
          ) : (
            <>
              <ChevronDown size={13} /> Show {lines.length - COLLAPSE_LINE_THRESHOLD} more lines
            </>
          )}
        </button>
      )}
    </div>
  );
}
