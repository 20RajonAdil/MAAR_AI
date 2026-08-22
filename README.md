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
