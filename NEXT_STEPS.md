# NEXT_STEPS.md — what's real, what's simplified, what's left

Being upfront about scope, per the brief: this is a genuinely large product.
Everything below marked ✅ is real, working code that I built and verified
(the project runs `npm run build` clean, with TypeScript checking and ESLint
passing, and I confirmed by inspecting the compiled output that
`NVIDIA_API_KEY` never reaches the client bundle). Everything marked ⚠️ is a
deliberate simplification I made rather than fake — I'd rather tell you what
still needs a pass than ship something that looks finished but silently
doesn't work.

## ✅ Fully implemented and verified

- Provider abstraction (`src/lib/ai/*`) with a real, server-only NVIDIA NIM
  integration (OpenAI-compatible `/chat/completions`, SSE streaming, image
  input passthrough, reasoning-status surfacing without exposing hidden
  chain-of-thought)
- `/api/chat` streaming route and `/api/models` registry route
- IndexedDB persistence via Dexie: conversations, messages, settings — survives
  refresh, supports rename/delete/archive/search
- JSON + Markdown export, JSON import (never silently overwrites existing
  conversations)
- Model selector with accurate, per-model capability badges — nothing is
  advertised that isn't in `models.ts`
- Composer: multiline input, Enter/Shift+Enter, drag-and-drop image
  attachments (gated by model capability), stop generation
- Streaming message rendering with markdown, tables, syntax-highlighted code
  blocks (line numbers, copy, download, collapse for long snippets)
- Edit & resend, regenerate, copy — all wired to actually truncate and
  resend conversation history correctly
- Full branding: logo, compact logo, favicon (svg/ico/png), Apple touch icon,
  manifest, robots.txt, sitemap.xml, Open Graph/Twitter metadata
- Your background image, processed into jpg/webp/blur-placeholder, wired
  into a configurable `BackgroundLayer` with opacity/blur/overlay controls
- Light/dark/system theme with no flash-of-wrong-theme on load
- `prefers-reduced-motion` respected globally, plus an explicit in-app toggle
- Settings: storage usage estimate + counts, clear-all-data with a
  confirmation step
- Offline app-shell caching via `public/sw.js` (cache-first for static
  assets, network-first for the page, `/api/*` is always network-only so a
  streamed response is never served stale)
- Accessible dialogs/dropdowns/switches/sliders (Radix primitives), visible
  focus rings, ARIA labels throughout
- Self-hosted fonts (no external font requests — fits the local-first
  positioning and also avoids a network dependency the sandbox couldn't
  reach anyway)

## ⚠️ Deliberately simplified — needs a follow-up pass

- **3D visuals**: I did not wire in a Thrine 3D asset. Doing this honestly
  needs your actual exported 3D asset (glTF/GLB) and a decision about where
  it should live — the brief mentions the landing screen or empty-chat state
  as candidates. I left this out rather than fabricate a placeholder cube;
  happy to add a `<Scene3D>` component (lazy-loaded, `dynamic(() => import(...),
  { ssr: false })`, simplified on low-power devices) once you have an asset.
- **OriginKit**: I did not import a third-party animation library from
  originkit.dev — that site ships design *patterns* to reference, not an
  installable package. I built the same spirit (subtle particle-like seam
  animation, rise-in transitions, hover micro-interactions) as first-party
  Tailwind/CSS + a little Framer Motion, all respecting reduced-motion.
- **Live NVIDIA smoke test**: I could not test an actual streaming
  completion against `build.nvidia.com` from this sandbox (network egress is
  restricted to package registries). The request/response shapes match
  NVIDIA's documented OpenAI-compatible API, and the SSE parsing is
  defensive (ignores malformed keep-alive frames, handles `[DONE]`), but you
  should do one real end-to-end test with your API key before shipping.
- **Audio/video input**: the `ModelDefinition` capability system supports
  `audio-input` / `video-input` and the composer already gates attachments
  by capability, but the composer's file picker currently only accepts
  `image/*`. Once you pick a specific NIM model with audio/video support,
  widening the `accept` attribute and confirming NVIDIA's expected payload
  shape for that media type is a small, contained change in `Composer.tsx`
  and `provider.ts`.
- **cuOpt skill**: the brief's instruction to install
  `npx skills add NVIDIA/skills --skill cuopt-developer --agent claude-code`
  is a Claude Code CLI step for *your* local environment, not something this
  chat environment can run — and cuOpt (route/logistics optimization)
  doesn't have a natural fit in a chat app, so per the brief's own
  instruction ("only use cuOpt-related functionality if it genuinely
  benefits the project"), I didn't force in unrelated functionality.
- **Virtualization for very long conversations**: message rendering is not
  virtualized. Fine for typical conversation lengths; if you expect
  conversations with many hundreds of messages, swap `ChatWindow`'s message
  list for `react-virtuoso` or similar.
- **Automated test suite**: none included. The build/type-check/lint pass is
  the verification I ran; no unit or e2e tests exist yet.

## Before you deploy

1. `npm install`
2. `cp .env.example .env.local` and set a real `NVIDIA_API_KEY`
3. `npm run build && npm run start`, then do one real chat exchange to
   confirm streaming works end-to-end against NVIDIA
4. Update `metadataBase` in `src/app/layout.tsx` and the `Sitemap:` line in
   `public/robots.txt` from the placeholder `https://maar.ai` to your real
   domain
5. If deploying somewhere other than Vercel/a Node host, confirm your
   platform supports the Edge/Node streaming response used in
   `src/app/api/chat/route.ts`
