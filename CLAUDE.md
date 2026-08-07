# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server (Turbopack) at http://localhost:3000
- `npm run build` — production build
- `npm run start` — run a production build
- `npm run lint` / `npx eslint .` — lint (flat config in `eslint.config.mjs`, extends `eslint-config-next`)
- `npx tsc --noEmit` — type-check (no separate typecheck script defined)

There is no test runner configured in this project.

## Architecture

This is a Next.js 16 App Router chat UI that talks to multiple LLM providers through the Vercel AI SDK (`ai` v7 + `@ai-sdk/react` v4 — note the major versions are independent and both current). Chat history is stored client-side in IndexedDB; there is no backend database or auth.

**Request flow**: `src/components/ChatWindow.tsx` uses `useChat` (from `@ai-sdk/react`) with a `DefaultChatTransport` pointed at `POST /api/chat`. Provider and model selection are sent as extra body fields on every request (`{ provider, model }`), not baked into the transport, because each conversation can use a different provider/model. `src/app/api/chat/route.ts` validates the provider, resolves a `LanguageModel` instance, and streams back a UI message stream via `streamText(...).toUIMessageStreamResponse()`.

**Adding a provider**: everything provider-related is centralized in `src/lib/providers.ts` — the `PROVIDERS` list (id/label/models shown in the UI) and the `resolveModel(providerId, modelId)` switch (constructs the AI SDK provider client from an env var API key). To add a provider: install its `@ai-sdk/*` package, add a case to `resolveModel`, add an entry to `PROVIDERS`, and add the API key to `.env.local` / `.env.local.example`. `ProviderId` is a union type, not an enum, so TypeScript will flag any switch that isn't exhaustive.

**Message typing**: `src/lib/chat-types.ts` defines `ChatUIMessage = UIMessage<MessageMetadata>`, where `MessageMetadata` carries per-message token `usage`. The API route attaches usage via the `messageMetadata` callback in `toUIMessageStreamResponse`, reading it off the stream's `finish` event (`part.totalUsage`). This typed message flows through `useChat<ChatUIMessage>`, `Conversation.messages` in `src/lib/db.ts`, and is rendered in `src/components/MessageBubble.tsx`.

**Conversation persistence (IndexedDB, no server)**: `src/lib/db.ts` wraps the `idb` package around a single `conversations` object store (DB name `ai-chat-app`). `src/hooks/useConversations.ts` is the sole owner of conversation list state — it loads all conversations on mount, and exposes create/select/delete/update-settings/persist-messages operations that both update React state and write through to IndexedDB. `src/app/page.tsx` wires this hook to `Sidebar` and `ChatWindow`.

**Per-conversation chat identity**: `ChatWindow` is mounted with `key={activeConversation.id}` in `page.tsx`, so switching conversations fully remounts it rather than relying on `useChat`'s internal `id`-diffing — this guarantees clean state (input, textarea sizing, in-flight request) per conversation. `useChat({ id, messages: conversation.messages, onFinish })` hydrates from IndexedDB on mount and persists the full message array back via `onFinish`.

**Editing a sent message**: `MessageBubble` calls `sendMessage({ text, messageId }, ...)`. Per the AI SDK's `Chat` class, passing an existing user message's `messageId` truncates every message after it and replaces that message, then re-requests — this is what drives "edit and regenerate."

**Markdown rendering**: only assistant messages are rendered as markdown (`src/components/MarkdownContent.tsx`, using `react-markdown` + `remark-gfm`); user messages render as plain text. Raw HTML passthrough (`rehype-raw`) is sanitized (`rehype-sanitize`) with `defaultSchema` extended to allow `u` and `mark` tags (for underline/highlight, which have no native markdown syntax) — do not widen the allow-list without considering that assistant output is a potential XSS vector via prompt injection.

**Voice input**: `src/hooks/useSpeechRecognition.ts` wraps the (non-standard) Web Speech API. Type declarations for `SpeechRecognition` are hand-written in `src/types/speech-recognition.d.ts` since neither TypeScript's DOM lib nor `@types/*` fully cover it. The hook accumulates finalized transcript segments internally and reports the running combined transcript through `onTranscript`; `ChatWindow` prepends whatever was already typed (captured in `baseInputRef` when recording starts) rather than overwriting it.

**Theming**: dark/light mode uses `next-themes` with the `class` strategy. Tailwind v4 is CSS-first (no `tailwind.config.js`); the `dark:` variant is enabled via `@custom-variant dark (&:where(.dark, .dark *));` in `src/app/globals.css`, not Tailwind's default media-query strategy.

**Output length**: `MAX_OUTPUT_TOKENS` in `src/app/api/chat/route.ts` is a single flat constant applied to every provider/model (deliberately not per-model — that was tried and reverted).

## Notes

- `.claude/CLAUDE.md` (`@AGENTS.md`) and root `AGENTS.md` are written by `next dev` itself (see `node_modules/next/dist/server/lib/generate-agent-files.js`) to flag that this Next.js version may have breaking changes vs. training data — they are not project-authored files and get re-added by the dev server.
- No system prompt is enforced anywhere except `src/lib/system-prompt.ts`, which is passed as `system` to every `streamText` call.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
