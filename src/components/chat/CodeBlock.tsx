'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, Download, Loader2, Play, X } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import { cn } from '@/lib/utils/cn';
import { registerHighlightLanguages } from '@/lib/highlight-languages';
import { runJavaScript, type RunResult } from '@/lib/sandbox/run-js';
import { runPython } from '@/lib/sandbox/run-python';

registerHighlightLanguages(hljs);

interface Props {
  className?: string; // e.g. "language-tsx", passed by react-markdown
  children: string;
}

const COLLAPSE_LINE_THRESHOLD = 24;

// Languages MAAR can actually execute — all sandboxed, all client-side,
// and only ever triggered by an explicit click on this button. Nothing
// runs automatically, and this is unrelated to what a model can do on
// its own; it's purely "let the person try this snippet."
const RUNNABLE_LANGUAGES = new Set(['javascript', 'js', 'python', 'py', 'html']);

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

type RunOutput =
  | { kind: 'js'; result: RunResult }
  | { kind: 'python'; output: string; error: string | null }
  | { kind: 'html' };

function JsOutputPanel({ result }: { result: RunResult }) {
  return (
    <div className="border-t border-border bg-[#0A0C11] px-3 py-2 font-mono text-xs">
      {result.logs.length === 0 && !result.error && !result.timedOut && (
        <p className="text-ink-faint">Ran with no output.</p>
      )}
      {result.logs.map((log, i) => (
        <p
          key={i}
          className={cn(
            'whitespace-pre-wrap',
            log.level === 'error' ? 'text-danger' : log.level === 'warn' ? 'text-gold' : 'text-ink',
          )}
        >
          {log.text}
        </p>
      ))}
      {result.error && <p className="whitespace-pre-wrap text-danger">Error: {result.error}</p>}
      {result.timedOut && <p className="text-gold">Stopped — this took longer than 6 seconds to run.</p>}
    </div>
  );
}

function PythonOutputPanel({ output, error }: { output: string; error: string | null }) {
  return (
    <div className="border-t border-border bg-[#0A0C11] px-3 py-2 font-mono text-xs">
      {output && <p className="whitespace-pre-wrap text-ink">{output}</p>}
      {error && <p className="whitespace-pre-wrap text-danger">{error}</p>}
      {!output && !error && <p className="text-ink-faint">Ran with no output.</p>}
    </div>
  );
}

export function CodeBlock({ className, children }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<RunOutput | null>(null);

  const language = (className ?? '').replace('language-', '') || 'text';
  const code = children.replace(/\n$/, '');
  const lines = useMemo(() => code.split('\n'), [code]);
  const isLong = lines.length > COLLAPSE_LINE_THRESHOLD;
  const visibleLines = expanded || !isLong ? lines : lines.slice(0, COLLAPSE_LINE_THRESHOLD);
  const isRunnable = RUNNABLE_LANGUAGES.has(language);
  const isHtml = language === 'html';

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

  const handleRun = async () => {
    if (isHtml) {
      setOutput(output?.kind === 'html' ? null : { kind: 'html' }); // toggle preview
      return;
    }
    setRunning(true);
    setOutput(null);
    if (language === 'python' || language === 'py') {
      const result = await runPython(code);
      setOutput({ kind: 'python', output: result.output, error: result.error });
    } else {
      const result = await runJavaScript(code);
      setOutput({ kind: 'js', result });
    }
    setRunning(false);
  };

  return (
    <div className="not-prose my-3 overflow-hidden rounded-xl border border-border bg-[#0A0C11]">
      <div className="flex items-center justify-between border-b border-border bg-base-raised2 px-3 py-1.5">
        <span className="font-mono text-xs text-ink-faint">{language}</span>
        <div className="flex items-center gap-1">
          {isRunnable && (
            <button
              type="button"
              onClick={handleRun}
              disabled={running}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                output?.kind === 'html'
                  ? 'bg-ice/15 text-ice hover:bg-ice/20'
                  : 'text-ink-muted hover:bg-base-raised hover:text-ink',
              )}
              aria-label={isHtml ? 'Preview HTML' : 'Run code'}
              title={
                language === 'python' || language === 'py'
                  ? 'Runs in your browser via Pyodide \u2014 first run loads the Python runtime (~10MB)'
                  : 'Runs in an isolated sandbox in your browser'
              }
            >
              {running ? (
                <Loader2 size={13} className="animate-spin" />
              ) : output?.kind === 'html' ? (
                <X size={13} />
              ) : (
                <Play size={13} />
              )}
              {running ? 'Running…' : isHtml ? (output?.kind === 'html' ? 'Close' : 'Preview') : 'Run'}
            </button>
          )}
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
      {output?.kind === 'js' && <JsOutputPanel result={output.result} />}
      {output?.kind === 'python' && <PythonOutputPanel output={output.output} error={output.error} />}
      {output?.kind === 'html' && (
        <iframe
          sandbox="allow-scripts"
          srcDoc={code}
          title="HTML preview"
          className="h-72 w-full border-t border-border bg-white"
        />
      )}
    </div>
  );
}
