# MAAR AI

A premium, local-first AI workspace built on NVIDIA NIM models. Conversations,
messages, and settings live entirely in your browser's IndexedDB — nothing is
synced to a server, there's no login, and no account is ever created. When
you send a message to a hosted NVIDIA model, that message (and any
attachment) is sent to NVIDIA's API to generate a response; nothing else
leaves your device.

Created by **Md Adil Rajon**. © MAAR AI.

## Getting started

```bash
npm install
cp .env.example .env.local
# edit .env.local and set NVIDIA_API_KEY to a real key from https://build.nvidia.com
npm run dev
```

Open https://maar-ai.vercel.app/

## Scripts

- `npm run dev` — local development server
- `npm run build` — production build (also type-checks and lints)
- `npm run start` — run the production build
- `npm run lint` — lint only

## Project structure

```
src/
  app/
    page.tsx              entry point — renders <AppShell />
    layout.tsx             root layout, metadata, theme + SW bootstrap
    globals.css             design tokens (light/dark), typography, prose styles
    api/
      chat/route.ts         streaming proxy to NVIDIA (server-only)
      models/route.ts        exposes the public model registry
  lib/
    ai/
      types.ts               shared types
      models.ts               NVIDIA NIM model registry — ADD NEW MODELS HERE
      provider.ts             server-only NVIDIA client (never imported client-side)
      client.ts                browser-side SSE consumer of /api/chat
      streaming.ts             SSE parsing helpers
      errors.ts                friendly, sanitized error messages
    db/
      index.ts                Dexie (IndexedDB) schema
      conversations.ts        conversation/message CRUD + search
      settings.ts              settings persistence, storage estimate, clear-data
    utils/
      export.ts                JSON/Markdown export + import
      cn.ts                     className helper
  components/
    layout/                   AppShell, Sidebar, ThemeScript, ServiceWorkerRegister
    chat/                     Composer, ChatWindow, MessageBubble, ModelSelector,
                               CodeBlock, ThinkingIndicator, EmptyState, etc.
    settings/                 SettingsPanel, StorageInfo
    background/               BackgroundLayer (your custom image lives here)
    ui/                       Button, Dialog, Switch, Slider, Tooltip
  hooks/
    useConversations.ts       orchestrates DB + streaming state
    useSettings.ts             settings state backed by IndexedDB
    useOnlineStatus.ts         navigator.onLine tracking
public/
  background.jpg / .webp / background-tiny.jpg   your background image, 3 variants
  logo.svg, logo-compact.svg, favicon.*            MAAR branding
  manifest.webmanifest, robots.txt, sitemap.xml    PWA + SEO metadata
  sw.js                                             offline app-shell cache
```

## Adding a new NVIDIA NIM model

Add one entry to `src/lib/ai/models.ts` with `provider: 'nvidia-nim'` and
accurate `capabilities`. That's it — the model selector, the multimodal
composer gating (e.g. disabling image attachments for text-only models),
and the API route all read from that one file. Never mark a capability
`true` unless the model actually supports it.

## Using OpenRouter models alongside NVIDIA

MAAR ships with OpenRouter wired in as a second provider behind the same
abstraction layer (`src/lib/ai/providers/openrouter.ts`), so models from
both show up together in the model selector, grouped by provider.

1. Get a key from https://openrouter.ai/keys
2. Set `OPENROUTER_API_KEY` in `.env.local`
3. Add or adjust entries in `src/lib/ai/models.ts` with
   `provider: 'openrouter'` — the `id` must match OpenRouter's model id
   exactly (see https://openrouter.ai/models)

Both providers speak the same OpenAI-compatible streaming shape, so adding
a third provider later just means a new file in `src/lib/ai/providers/`
plus one new case in the dispatcher (`src/lib/ai/provider.ts`) — nothing
in the UI needs to change.

The model picker groups every model into **Free models**, **NVIDIA Agent**,
and **OpenRouter Agent**, and shows a short "Best for" tag on each one
(coding, long-form writing, reasoning, etc.) so it's clear which model to
reach for.

## Automatic fallback when a model hits its limit

Every model in `models.ts` can declare a `fallbackModelId` pointing at a
capability-equivalent model — usually on the other provider, for real
redundancy. If a request fails with a rate-limit or availability error
mid-conversation, MAAR automatically retries the same message against the
fallback once and adds a short note to the response ("Switched to …").
No error is shown to the person unless the fallback also fails.

## Image generation

Toggle "Image" in the composer to switch it into image-generation mode.
Prompts go to `google/gemini-2.5-flash-image` via OpenRouter's image
generation support on `/chat/completions` (`modalities: ["image", "text"]`)
— see `src/lib/ai/providers/openrouter-image.ts` and `src/app/api/image/route.ts`.
Generated images are downloadable and stored locally like any other
attachment. Requires `OPENROUTER_API_KEY`.

## Read aloud (voice output)

Assistant messages have a speaker icon that reads the response aloud using
the browser's built-in Web Speech API (`speechSynthesis`) — entirely
client-side, no API key or network call involved. Voice **input** (talking
to MAAR) isn't wired up yet; see `NEXT_STEPS.md`.

## Documents (any model can "read" a file)

The paperclip in the composer now accepts PDF, DOCX, TXT, MD, CSV, JSON,
YAML, and log files, not just images. Text is extracted entirely in the
browser (`pdfjs-dist` for PDF, `mammoth` for DOCX) and folded into the
outgoing message before it reaches any provider — so this works with
every model, including ones with no native file-upload support, capped
at 50,000 characters per document. See `src/lib/attachments/extract-text.ts`
and `src/lib/ai/document-block.ts`.

## Code execution ("Run" on a code block)

JavaScript, Python, and HTML code blocks get a "Run" button. Nothing
executes automatically — only on an explicit click. JS/HTML run in an
iframe sandboxed with `allow-scripts` and deliberately *no*
`allow-same-origin`, which gives the iframe an opaque origin: it cannot
reach MAAR's cookies, storage, or same-origin routes. Python runs via
Pyodide (WASM CPython), loaded from its CDN on first use. See
`src/lib/sandbox/run-js.ts` and `src/lib/sandbox/run-python.ts`.

## Web search

Toggle "Search" in the composer (visible for OpenRouter models only) to
let MAAR look things up before answering, using OpenRouter's server-side
`openrouter:web_search` tool — the search itself runs on OpenRouter's
end, not MAAR's. Sources render as clickable chips under the answer.
Costs extra OpenRouter credits per search, disclosed in the toggle's
tooltip. See `src/lib/ai/providers/openrouter.ts`.

## Voice input

The mic button next to the composer transcribes speech using the
browser's built-in `SpeechRecognition` — no API key, no network call,
same approach as the existing read-aloud (`speechSynthesis`) feature.
Hides itself on browsers without support (Firefox, mainly). See
`src/lib/voice/use-voice-input.ts`.

## Skills (upload custom instructions)

Settings → Skills lets you upload a plain-text `.md` or `.txt` file with
instructions, a style guide, or domain knowledge (capped at 200KB). Every
*enabled* skill is sent to the model as a system message on every request
in `useConversations.sendMessage` — see `src/lib/db/skills.ts`.

This deliberately only ever injects text as instructions; it does not
execute anything from the uploaded file. Running arbitrary code from a
user-uploaded file would be a real security risk, so that's out of scope
by design, not an oversight.

**Add from GitHub**: paste a repo link (looks for `SKILL.md` at the root),
a folder link, or a direct/raw file link. Tested against live GitHub URLs
before shipping — see `scripts/test-github-skill-import.mjs`. Only
`github.com`, `raw.githubusercontent.com`, `gist.githubusercontent.com`,
and `gist.github.com` are ever fetched (an explicit allowlist, not a
general URL fetcher — anything else is rejected server-side to avoid
turning this into an SSRF vector). Direct file/raw links don't use
GitHub's API at all and have no rate limit; repo/folder links do, and
share GitHub's unauthenticated 60-requests/hour limit across everyone
using this deployment. Set the optional `GITHUB_TOKEN` env var to raise
that to 5,000/hour.

**Add from a .zip**: upload a `.zip` of a whole skill folder — like a
real Claude Skill with a `SKILL.md` plus reference files — and MAAR
extracts every readable text file inside (capped at 400KB combined),
skips anything binary, strips a common top-level folder (the way
GitHub's "Download ZIP" wraps everything in one), and puts `SKILL.md`
first in the combined content. See `src/lib/db/skills.ts`
(`addSkillFromZip`) and the runnable proof in
`scripts/test-zip-skill-extract.mjs`.

## Security

- `NVIDIA_API_KEY` and `OPENROUTER_API_KEY` are each read only inside their
  own file under `src/lib/ai/providers/`, and every file in that chain
  starts with `import 'server-only'` — importing one from a client
  component is a **build-time error**, not just a lint warning.
- Neither key is ever prefixed with `NEXT_PUBLIC_`, so Next.js never inlines
  them into a client bundle. This was verified by grepping the production
  `.next/static` output for both key values after a build — neither appears.
- `.env.local` is git-ignored. Only `.env.example` (with placeholders) is
  committed.

## Replacing the background image

Swap `public/background.jpg`, `public/background.webp`, and
`public/background-tiny.jpg` (a small blurred placeholder, ~32px wide, used
for instant paint) for your own image at the same filenames. Every opacity /
blur / overlay control in Settings → Appearance keeps working unchanged.

## What's simplified in this pass

See `NEXT_STEPS.md`.
