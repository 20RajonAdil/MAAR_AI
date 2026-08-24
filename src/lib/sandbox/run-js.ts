'use client';

/**
 * Runs JavaScript in a fully isolated iframe — sandbox="allow-scripts"
 * WITHOUT "allow-same-origin". That combination is what makes this safe:
 * the iframe gets an opaque origin, so code running inside it cannot
 * reach MAAR's own cookies, localStorage, IndexedDB, or same-origin API
 * routes, no matter what the code tries. It communicates results back
 * only via postMessage, which works across opaque origins.
 *
 * This only ever runs when the person explicitly clicks "Run" on a code
 * block — never automatically, and never anything from an uploaded file
 * or skill.
 */

export interface RunResult {
  logs: { level: 'log' | 'warn' | 'error'; text: string }[];
  error: string | null;
  timedOut: boolean;
}

const TIMEOUT_MS = 6000;

function buildSandboxDoc(userCode: string): string {
  // The user's code is placed inside a template literal via JSON.stringify,
  // so it is never concatenated as raw script text — this avoids any
  // string-escaping injection risk in how the code reaches eval().
  const encoded = JSON.stringify(userCode);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
    (function () {
      const send = (type, payload) => parent.postMessage({ __maarSandbox: true, type, payload }, '*');
      const fmt = (v) => {
        try { return typeof v === 'string' ? v : JSON.stringify(v, null, 2); }
        catch { return String(v); }
      };
      console.log = (...args) => send('log', args.map(fmt).join(' '));
      console.warn = (...args) => send('warn', args.map(fmt).join(' '));
      console.error = (...args) => send('error', args.map(fmt).join(' '));
      window.onerror = (msg) => { send('runtime-error', String(msg)); return true; };
      try {
        const code = ${encoded};
        const result = (0, eval)(code);
        if (result !== undefined) send('log', fmt(result));
        send('done', null);
      } catch (err) {
        send('runtime-error', err && err.message ? err.message : String(err));
      }
    })();
  </script></body></html>`;
}

export function runJavaScript(code: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const logs: RunResult['logs'] = [];
    let settled = false;
    let error: string | null = null;

    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts'); // deliberately no allow-same-origin
    iframe.style.display = 'none';
    iframe.srcdoc = buildSandboxDoc(code);

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      iframe.remove();
    };

    const finish = (timedOut = false) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ logs, error, timedOut });
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.__maarSandbox !== true || event.source !== iframe.contentWindow) return;
      if (data.type === 'log') logs.push({ level: 'log', text: data.payload });
      else if (data.type === 'warn') logs.push({ level: 'warn', text: data.payload });
      else if (data.type === 'error') logs.push({ level: 'error', text: data.payload });
      else if (data.type === 'runtime-error') {
        error = data.payload;
        finish();
      } else if (data.type === 'done') finish();
    };

    const timer = setTimeout(() => finish(true), TIMEOUT_MS);

    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
}
