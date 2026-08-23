// Standalone test harness — validates the algorithm against real GitHub
// URLs before it gets ported into the actual TypeScript provider file.
const MAX_BYTES = 300_000;
const ALLOWED_HOSTS = ['github.com', 'raw.githubusercontent.com', 'gist.githubusercontent.com', 'gist.github.com'];
const SKILL_FILENAME_PRIORITY = ['SKILL.md', 'skill.md', 'Skill.md'];

function parseUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return { error: 'invalid-url' };
  }
  if (url.protocol !== 'https:') return { error: 'invalid-url' };
  if (!ALLOWED_HOSTS.includes(url.hostname)) return { error: 'unsupported-host' };
  return { url };
}

async function fetchTextGuarded(url) {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/vnd.github.raw+json, text/plain, */*' } });
  } catch {
    return { error: 'network' };
  }
  if (res.status === 404) return { error: 'not-found' };
  if (res.status === 403) return { error: 'rate-limited' };
  if (!res.ok) return { error: 'unknown', detail: res.status };

  const len = res.headers.get('content-length');
  if (len && Number(len) > MAX_BYTES) return { error: 'too-large' };

  const text = await res.text();
  if (text.length > MAX_BYTES) return { error: 'too-large' };
  if (text.includes('\u0000')) return { error: 'not-text' };
  return { text };
}

async function findSkillFileInContents(owner, repo, dirPath, ref) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}${ref ? `?ref=${ref}` : ''}`;
  let res;
  try {
    res = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github+json' } });
  } catch {
    return { error: 'network' };
  }
  if (res.status === 404) return { error: 'not-found' };
  if (res.status === 403) return { error: 'rate-limited' };
  if (!res.ok) return { error: 'unknown', detail: res.status };

  const listing = await res.json();
  if (!Array.isArray(listing)) return { error: 'not-found' };

  for (const name of SKILL_FILENAME_PRIORITY) {
    const match = listing.find((item) => item.type === 'file' && item.name === name);
    if (match) return { downloadUrl: match.download_url, name: match.name };
  }
  const anyMd = listing.find((item) => item.type === 'file' && item.name.toLowerCase().endsWith('.md'));
  if (anyMd) return { downloadUrl: anyMd.download_url, name: anyMd.name };

  return { error: 'no-skill-file' };
}

async function resolveGithubSkillUrl(input) {
  const parsed = parseUrl(input);
  if (parsed.error) return { ok: false, error: parsed.error };
  const url = parsed.url;

  // Case 1: already a raw content URL
  if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'gist.githubusercontent.com') {
    const result = await fetchTextGuarded(url.toString());
    if (result.error) return { ok: false, error: result.error };
    const name = url.pathname.split('/').pop() || 'skill';
    return { ok: true, name, content: result.text, sourceUrl: input };
  }

  // Case 2: gist.github.com/user/id
  if (url.hostname === 'gist.github.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const gistId = parts[parts.length - 1];
    let res;
    try {
      res = await fetch(`https://api.github.com/gists/${gistId}`, { headers: { Accept: 'application/vnd.github+json' } });
    } catch {
      return { ok: false, error: 'network' };
    }
    if (!res.ok) return { ok: false, error: res.status === 404 ? 'not-found' : 'unknown' };
    const json = await res.json();
    const files = Object.values(json.files || {});
    const preferred = files.find((f) => SKILL_FILENAME_PRIORITY.includes(f.filename)) || files[0];
    if (!preferred) return { ok: false, error: 'no-skill-file' };
    const result = await fetchTextGuarded(preferred.raw_url);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, name: preferred.filename, content: result.text, sourceUrl: input };
  }

  // Case 3+: github.com/...
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return { ok: false, error: 'invalid-url' };
  const [owner, repo, kind, branchOrRef, ...rest] = segments;

  // github.com/owner/repo/blob/branch/path/to/file.md
  if (kind === 'blob' && branchOrRef && rest.length > 0) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branchOrRef}/${rest.join('/')}`;
    const result = await fetchTextGuarded(rawUrl);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, name: rest[rest.length - 1], content: result.text, sourceUrl: input };
  }

  // github.com/owner/repo/tree/branch/dir
  if (kind === 'tree' && branchOrRef) {
    const dirPath = rest.join('/');
    const found = await findSkillFileInContents(owner, repo, dirPath, branchOrRef);
    if (found.error) return { ok: false, error: found.error };
    const result = await fetchTextGuarded(found.downloadUrl);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, name: found.name, content: result.text, sourceUrl: input };
  }

  // github.com/owner/repo (bare repo root, default branch)
  const cleanRepo = repo.replace(/\.git$/, '');
  const found = await findSkillFileInContents(owner, cleanRepo, '', undefined);
  if (found.error) return { ok: false, error: found.error };
  const result = await fetchTextGuarded(found.downloadUrl);
  if (result.error) return { ok: false, error: result.error };
  return { ok: true, name: found.name, content: result.text, sourceUrl: input };
}

// --- Tests against real GitHub URLs ---
const tests = [
  'https://github.com/NVIDIA/skills',
  'https://github.com/NVIDIA/skills/blob/main/README.md',
  'https://github.com/NVIDIA/skills/tree/main/components.d',
  'https://raw.githubusercontent.com/NVIDIA/skills/main/README.md',
  'https://github.com/this-org-should-not-exist-xyz123/nope',
  'not a url at all',
  'https://evil.com/steal-secrets',
  'ftp://github.com/NVIDIA/skills',
];

for (const t of tests) {
  const result = await resolveGithubSkillUrl(t);
  console.log('---', t);
  if (result.ok) {
    console.log('  OK  name=%s bytes=%d sourceUrl=%s', result.name, result.content.length, result.sourceUrl);
    console.log('  preview:', result.content.slice(0, 80).replace(/\n/g, ' '));
  } else {
    console.log('  ERR ', result.error);
  }
}
