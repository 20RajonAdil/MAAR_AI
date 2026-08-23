import 'server-only';

/**
 * Resolves a GitHub URL (bare repo, blob file, tree/folder, raw content
 * link, or gist) down to a single piece of skill text. Tested against
 * live GitHub URLs before shipping — see scripts/test-github-skill-import.mjs.
 *
 * Security: only github.com, raw.githubusercontent.com,
 * gist.githubusercontent.com, and gist.github.com are ever fetched. This
 * is a deliberate allowlist, not a general-purpose URL fetcher — without
 * it, this endpoint would be an SSRF vector letting someone probe
 * internal network addresses through the server.
 *
 * This only ever extracts and returns text. It does not download,
 * inspect, or execute any script, binary, or non-text file in a repo.
 */

const MAX_BYTES = 300_000;
const ALLOWED_HOSTS = ['github.com', 'raw.githubusercontent.com', 'gist.githubusercontent.com', 'gist.github.com'];
const SKILL_FILENAME_PRIORITY = ['SKILL.md', 'skill.md', 'Skill.md'];

export type GithubImportErrorCode =
  | 'invalid-url'
  | 'unsupported-host'
  | 'not-found'
  | 'rate-limited'
  | 'too-large'
  | 'not-text'
  | 'no-skill-file'
  | 'network'
  | 'unknown';

export interface GithubImportResult {
  ok: true;
  name: string;
  content: string;
  sourceUrl: string;
}

export interface GithubImportError {
  ok: false;
  error: GithubImportErrorCode;
}

function githubApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function parseUrl(input: string): { url: URL } | { error: GithubImportErrorCode } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { error: 'invalid-url' };
  }
  if (url.protocol !== 'https:') return { error: 'invalid-url' };
  if (!ALLOWED_HOSTS.includes(url.hostname)) return { error: 'unsupported-host' };
  return { url };
}

async function fetchTextGuarded(
  url: string,
): Promise<{ text: string } | { error: GithubImportErrorCode }> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/vnd.github.raw+json, text/plain, */*' } });
  } catch {
    return { error: 'network' };
  }
  if (res.status === 404) return { error: 'not-found' };
  if (res.status === 403) return { error: 'rate-limited' };
  if (!res.ok) return { error: 'unknown' };

  const len = res.headers.get('content-length');
  if (len && Number(len) > MAX_BYTES) return { error: 'too-large' };

  const text = await res.text();
  if (text.length > MAX_BYTES) return { error: 'too-large' };
  if (text.includes('\u0000')) return { error: 'not-text' };
  return { text };
}

async function findSkillFileInContents(
  owner: string,
  repo: string,
  dirPath: string,
  ref: string | undefined,
): Promise<{ downloadUrl: string; name: string } | { error: GithubImportErrorCode }> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}${ref ? `?ref=${ref}` : ''}`;
  let res: Response;
  try {
    res = await fetch(apiUrl, { headers: githubApiHeaders() });
  } catch {
    return { error: 'network' };
  }
  if (res.status === 404) return { error: 'not-found' };
  if (res.status === 403) return { error: 'rate-limited' };
  if (!res.ok) return { error: 'unknown' };

  const listing = await res.json();
  if (!Array.isArray(listing)) return { error: 'not-found' };

  for (const name of SKILL_FILENAME_PRIORITY) {
    const match = listing.find((item: any) => item.type === 'file' && item.name === name);
    if (match) return { downloadUrl: match.download_url, name: match.name };
  }
  const anyMd = listing.find((item: any) => item.type === 'file' && item.name.toLowerCase().endsWith('.md'));
  if (anyMd) return { downloadUrl: anyMd.download_url, name: anyMd.name };

  return { error: 'no-skill-file' };
}

export async function resolveGithubSkillUrl(input: string): Promise<GithubImportResult | GithubImportError> {
  const parsed = parseUrl(input);
  if ('error' in parsed) return { ok: false, error: parsed.error };
  const url = parsed.url;

  // Case 1: already a raw content URL — no API call, no rate limit.
  if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'gist.githubusercontent.com') {
    const result = await fetchTextGuarded(url.toString());
    if ('error' in result) return { ok: false, error: result.error };
    const name = url.pathname.split('/').pop() || 'skill';
    return { ok: true, name, content: result.text, sourceUrl: input };
  }

  // Case 2: gist.github.com/user/id
  if (url.hostname === 'gist.github.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const gistId = parts[parts.length - 1];
    let res: Response;
    try {
      res = await fetch(`https://api.github.com/gists/${gistId}`, { headers: githubApiHeaders() });
    } catch {
      return { ok: false, error: 'network' };
    }
    if (!res.ok) return { ok: false, error: res.status === 404 ? 'not-found' : res.status === 403 ? 'rate-limited' : 'unknown' };
    const json = await res.json();
    const files: any[] = Object.values(json.files || {});
    const preferred = files.find((f) => SKILL_FILENAME_PRIORITY.includes(f.filename)) || files[0];
    if (!preferred) return { ok: false, error: 'no-skill-file' };
    const result = await fetchTextGuarded(preferred.raw_url);
    if ('error' in result) return { ok: false, error: result.error };
    return { ok: true, name: preferred.filename, content: result.text, sourceUrl: input };
  }

  // Case 3+: github.com/...
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return { ok: false, error: 'invalid-url' };
  const [owner, repo, kind, branchOrRef, ...rest] = segments;

  // github.com/owner/repo/blob/branch/path/to/file.md — no API call needed.
  if (kind === 'blob' && branchOrRef && rest.length > 0) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branchOrRef}/${rest.join('/')}`;
    const result = await fetchTextGuarded(rawUrl);
    if ('error' in result) return { ok: false, error: result.error };
    return { ok: true, name: rest[rest.length - 1], content: result.text, sourceUrl: input };
  }

  // github.com/owner/repo/tree/branch/dir — needs the contents API.
  if (kind === 'tree' && branchOrRef) {
    const dirPath = rest.join('/');
    const found = await findSkillFileInContents(owner, repo, dirPath, branchOrRef);
    if ('error' in found) return { ok: false, error: found.error };
    const result = await fetchTextGuarded(found.downloadUrl);
    if ('error' in result) return { ok: false, error: result.error };
    return { ok: true, name: found.name, content: result.text, sourceUrl: input };
  }

  // github.com/owner/repo (bare repo root, default branch) — needs the contents API.
  const cleanRepo = repo.replace(/\.git$/, '');
  const found = await findSkillFileInContents(owner, cleanRepo, '', undefined);
  if ('error' in found) return { ok: false, error: found.error };
  const result = await fetchTextGuarded(found.downloadUrl);
  if ('error' in result) return { ok: false, error: result.error };
  return { ok: true, name: found.name, content: result.text, sourceUrl: input };
}
