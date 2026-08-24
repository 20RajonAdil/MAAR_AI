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
- **Voice input** (talking to MAAR instead of typing): not implemented.
  Read-aloud (voice *output*) is real and works today via the browser's
  Web Speech API. Voice input would need microphone capture in the
  composer plus a speech-to-text model — OpenRouter/NVIDIA both list ASR
  models (e.g. Qwen3 ASR) that could back this the same way image
  generation is wired up, but it's a separate contained feature, not done
  here.
- **Image generation is scoped to one model.** `google/gemini-2.5-flash-image`
  is wired up end-to-end (composer toggle → `/api/image` → OpenRouter's
  `/chat/completions` with `modalities: ["image","text"]` → rendered,
  downloadable image in the chat). I could not test a live call against
  OpenRouter from this sandbox (network egress is restricted to package
  registries), so the response-parsing logic in
  `providers/openrouter-image.ts` defensively handles a couple of likely
  response shapes for the `images` field, based on OpenRouter's
  documentation — do one real test after adding your key. Adding more
  image models is one more entry in `models.ts` with
  `capabilities.outputs: ['image']`.
- **Automatic model fallback** retries against `fallbackModelId` only on
  `rate-limited` / `model-unavailable` errors, capped at one hop, to avoid
  silently cascading through every model in the registry. The fallback
  chains in `models.ts` are my best judgment for "similar capability,
  different provider" pairings — adjust them if you'd prefer a different
  order (e.g. always falling back to a free model to guarantee the
  conversation never hard-stops).
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
   `public/robots.txt` from the placeholder `https://maar-ai.vercel.app` to your real
   domain
5. If deploying somewhere other than Vercel/a Node host, confirm your
   platform supports the Edge/Node streaming response used in
   `src/app/api/chat/route.ts`

## Skills: GitHub import + mobile pass (latest round)

- **GitHub-link skill import is real and tested.** Direct file/raw links
  are unlimited (CDN-backed, no API call). Bare-repo and folder links use
  GitHub's contents API, which is capped at 60 unauthenticated
  requests/hour — I burned through that quota myself while testing this
  in the sandbox, which is exactly why I added optional `GITHUB_TOKEN`
  support rather than assuming it wouldn't matter. Without a token, that
  60/hour limit is shared across everyone hitting your deployment, not
  per-visitor — worth knowing before you rely on it for anything but
  occasional use.
- **Skills now accept a broader set of text extensions** (.py, .js, .sh,
  .json, .yaml, etc.), not just .md/.txt — still text-only, still never
  executed, per the scope decision from the previous round.
- ~~Not done: uploading a `.zip` bundle~~ — **done as of this round.**
  `addSkillFromZip` in `src/lib/db/skills.ts` extracts every readable text
  file from a `.zip`, skips binaries, strips a common wrapping folder, and
  prioritizes `SKILL.md`. Verified with a self-contained, re-runnable test
  (`scripts/test-zip-skill-extract.mjs`) that builds a test zip in memory
  and checks all of that behavior — all 6 checks pass.
- **Mobile**: the sidebar is now a proper off-canvas drawer on screens
  under `md` (768px), with a mobile top bar (menu button + current
  conversation/model name) replacing the old always-visible column. Also
  fixed: iOS Safari's zoom-on-input-focus (inputs now force 16px on small
  screens), the model picker dropdown and long model names no longer
  overflow narrow viewports, and a global `overflow-x: hidden` safety net.
  I could not test this on a real device from this sandbox — please check
  it on an actual phone, especially the drawer's swipe-adjacent feel and
  the composer's behavior with the on-screen keyboard open.

## Answer quality, document reading, code execution (latest round)

Someone reported MAAR feeling "weak" compared to Claude — reasonable, since
it was missing document reading, code execution, and had one real bug
hurting answer quality. Addressed all three:

- **Found and fixed a real bug**: `max_tokens` was capped at 2048 —
  genuinely low, and the direct cause of answers feeling clipped short.
  Raised to 8192.
- **Added a baseline system prompt** (`src/lib/ai/system-prompt.ts`).
  Previously MAAR sent no system message at all unless a skill was
  active, which tends to produce noticeably terser answers than even
  basic "be thorough, use good formatting" guidance. Skills now layer on
  top of this base prompt rather than replacing it.
- **Document reading, not just images**: PDF, DOCX, TXT, MD, CSV, JSON,
  YAML, and log files are now extracted to plain text entirely in the
  browser (`src/lib/attachments/extract-text.ts`, using `pdfjs-dist` and
  `mammoth`) and folded into the outgoing message
  (`src/lib/ai/document-block.ts`). This works with **any** model, not
  just vision-capable ones, since it's just text by the time it reaches
  the provider. Capped at 50,000 characters per document with a
  truncation notice if exceeded.
- **Code execution — sandboxed, client-side, explicit-click-only**.
  JavaScript and HTML run in an iframe with `sandbox="allow-scripts"` and
  deliberately *no* `allow-same-origin` — that combination gives the
  iframe an opaque origin, so code running there cannot reach MAAR's own
  cookies, localStorage, IndexedDB, or same-origin API routes, no matter
  what it tries. Python runs via Pyodide (WASM CPython), loaded from its
  official CDN only on first click, not bundled into the app. Nothing
  executes automatically — this is a "Run" button on a code block the
  person explicitly clicks, never something triggered by an uploaded file
  or the model's own output.

### Honestly, what's unverified here

I could not get a headless browser running in this sandbox (network
egress is locked to package registries, and Playwright's Chromium
download is blocked) — so unlike the zip-extraction and GitHub-import
logic earlier, **the actual JS-sandbox iframe/postMessage flow and the
Pyodide loading path have not been run in a real browser by me.** What I
could verify: the code that encodes a snippet before it reaches `eval()`
round-trips correctly for tricky input (template literals, quotes,
backticks, unicode — all pass). Please test the "Run" button on a real
JS and Python snippet once this is deployed; if something's off, it's
most likely in the postMessage event wiring, not the sandbox security
model itself.

Also not done: code execution for TypeScript (would need in-browser
transpilation) and for any language beyond JS/Python/HTML.
