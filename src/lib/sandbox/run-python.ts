'use client';

/**
 * Runs Python entirely in the browser via Pyodide (a WASM build of
 * CPython). Nothing is sent to any server — execution happens in the
 * person's own browser sandbox, same security model as any other
 * JavaScript running on the page.
 *
 * Pyodide itself (~10MB+ of WASM/data files) is loaded from its official
 * CDN on demand — only when someone actually clicks "Run" on a Python
 * code block — rather than bundled into MAAR's own app, which would
 * bloat every page load for a feature most visits won't use.
 */

export interface PyRunResult {
  output: string;
  error: string | null;
}

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v314.0.5/full/';

let pyodidePromise: Promise<any> | null = null;

function loadPyodideScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).loadPyodide) return resolve();
    const script = document.createElement('script');
    script.src = `${PYODIDE_CDN}pyodide.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the Python runtime from jsdelivr\u2019s CDN.'));
    document.head.appendChild(script);
  });
}

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodideScript().then(() => (window as any).loadPyodide({ indexURL: PYODIDE_CDN }));
  }
  return pyodidePromise;
}

/** Call once, ahead of time, to show a "loading the Python runtime" state before the first real run. */
export async function preloadPyodide(): Promise<void> {
  await getPyodide();
}

export async function runPython(code: string): Promise<PyRunResult> {
  try {
    const pyodide = await getPyodide();
    let output = '';
    pyodide.setStdout({ batched: (text: string) => (output += `${text}\n`) });
    pyodide.setStderr({ batched: (text: string) => (output += `${text}\n`) });

    try {
      await pyodide.runPythonAsync(code);
      return { output: output.trim(), error: null };
    } catch (err) {
      return { output: output.trim(), error: err instanceof Error ? err.message : String(err) };
    }
  } catch (err) {
    return { output: '', error: err instanceof Error ? err.message : 'Could not start the Python runtime.' };
  }
}
