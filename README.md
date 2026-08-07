# AI Chat App

A Next.js chat app that talks to multiple LLM providers, with a Groq/OpenRouter toggle, streaming responses, real chat history, and a web search tool — all running client-first with no backend database.

## Features

- **Multiple LLM providers** — switch between **Groq** and **OpenRouter** via a segmented toggle in the header, each with its own model dropdown (Llama 3.3 70B, Llama 3.1 8B Instant, GPT-OSS 120B on Groq; Llama 3.3 70B, DeepSeek Chat, Mistral Large on OpenRouter). Each conversation remembers which provider/model it was started with.
- **Streaming responses** — answers stream in token-by-token via the Vercel AI SDK.
- **Chat history** — conversations are saved to IndexedDB in the browser (no account, no server database). A sidebar groups them by Today / Yesterday / Previous 7 days / Older, with create, switch, and delete.
- **Markdown-formatted answers** — assistant replies render headings, bold/italic, lists, tables, links, code blocks, and underline/highlight; sanitized against unsafe HTML.
- **Copy & edit messages** — hover any message to copy it. Hover your own messages to edit and resend — this truncates everything after that point and regenerates the reply, like ChatGPT/Claude's edit flow.
- **Per-message token usage** — assistant replies show an output token count (hover for the input/output/total breakdown), from each provider's real usage reporting.
- **Voice input** — a mic button transcribes speech into the message box live (Web Speech API; disabled with a tooltip in unsupported browsers).
- **Web search tool** — the model can call a `webSearch` tool (backed by Tavily) for current-events or fact-lookup questions it can't answer confidently on its own. A system prompt keeps this on a leash: at most one search per question, never used for general knowledge/reasoning/coding, and some models are flagged to skip tools entirely if they don't support function-calling reliably.
- **Light & dark theme** — a toggle in the sidebar switches themes instantly (via `next-themes`), persisted across reloads, and defaults to your OS preference.
- **Responsive layout** — the sidebar collapses into an off-canvas drawer on mobile (hamburger menu, backdrop, auto-closes on selection); the chat area, composer, and message bubbles adapt down to phone widths.
- **Keyboard-first composer** — the input is a multi-line, auto-growing textarea. `Enter` inserts a new line; `Ctrl`/`Cmd`+`Enter` sends.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env example and add API keys for whichever providers/tools you want to use:

   ```bash
   cp .env.local.example .env.local
   ```

   - `GROQ_API_KEY` — https://console.groq.com/keys
   - `OPENROUTER_API_KEY` — https://openrouter.ai/keys
   - `TAVILY_API_KEY` — https://app.tavily.com (powers the web search tool; the app still works without it, just without search)

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Architecture

See [`CLAUDE.md`](./CLAUDE.md) for a fuller architectural walkthrough (provider registry, IndexedDB persistence flow, message typing, tool-calling setup, theming). In short:

- `src/lib/providers.ts` — the list of selectable providers/models and how to resolve each into an AI SDK `LanguageModel`.
- `src/app/api/chat/route.ts` — the streaming API route: validates the request, attaches the system prompt and web search tool, streams the response back.
- `src/lib/tools.ts` — the `webSearch` tool definition (Tavily-backed).
- `src/lib/db.ts` + `src/hooks/useConversations.ts` — IndexedDB-backed conversation storage.
- `src/components/` — `Sidebar`, `ChatWindow`, `MessageBubble`, `MarkdownContent`, theme components.

## Commands

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run a production build
- `npm run lint` — lint
- `npx tsc --noEmit` — type-check

## Deploy

Deploy on [Vercel](https://vercel.com/new) or any Node host that supports Next.js. Set the same environment variables (`GROQ_API_KEY`, `OPENROUTER_API_KEY`, `TAVILY_API_KEY`) in your hosting platform — chat history stays client-side, so nothing else needs provisioning.
