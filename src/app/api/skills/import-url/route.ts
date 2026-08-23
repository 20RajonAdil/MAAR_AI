import { NextRequest, NextResponse } from 'next/server';
import { resolveGithubSkillUrl, type GithubImportErrorCode } from '@/lib/skills/github-import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FRIENDLY_MESSAGES: Record<GithubImportErrorCode, string> = {
  'invalid-url': "That doesn't look like a valid URL.",
  'unsupported-host': 'MAAR can only import skills from github.com, raw.githubusercontent.com, or a gist link.',
  'not-found': "Couldn't find that — check the repo is public and the link is correct.",
  'rate-limited':
    "GitHub's API rate limit was hit (this is shared across everyone using this MAAR deployment). Try pasting a direct link to the file instead — click \"Raw\" on GitHub and copy that URL — which doesn't use the API at all. Or ask the site owner to set GITHUB_TOKEN to raise the limit.",
  'too-large': 'That file is too large for a skill (300KB max).',
  'not-text': "That doesn't look like a text file — skills must be plain text.",
  'no-skill-file': "Couldn't find a SKILL.md (or any .md file) in that location.",
  network: "Couldn't reach GitHub. Check your connection and try again.",
  unknown: 'Something went wrong importing that skill.',
};

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const url: string = typeof payload?.url === 'string' ? payload.url.trim() : '';
  if (!url) {
    return NextResponse.json({ error: 'A URL is required.' }, { status: 400 });
  }

  const result = await resolveGithubSkillUrl(url);

  if (!result.ok) {
    return NextResponse.json(
      { errorCode: result.error, error: FRIENDLY_MESSAGES[result.error] },
      { status: result.error === 'rate-limited' ? 429 : 400 },
    );
  }

  return NextResponse.json({ name: result.name, content: result.content, sourceUrl: result.sourceUrl });
}
