'use client';

export interface ImportSkillUrlResult {
  ok: true;
  name: string;
  content: string;
  sourceUrl: string;
}

export interface ImportSkillUrlError {
  ok: false;
  message: string;
}

export async function importSkillFromUrl(url: string): Promise<ImportSkillUrlResult | ImportSkillUrlError> {
  try {
    const response = await fetch('/api/skills/import-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.content) {
      return { ok: false, message: json?.error ?? 'Could not import that skill.' };
    }

    return { ok: true, name: json.name, content: json.content, sourceUrl: json.sourceUrl };
  } catch {
    return { ok: false, message: "Couldn't reach MAAR's server. Check your connection and try again." };
  }
}
