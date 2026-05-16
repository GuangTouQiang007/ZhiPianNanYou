# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Virtual Boyfriend Chat App (虚拟男友聊天产品) — a chat application with 4 AI boyfriend characters that have distinct personalities, voice (TTS), and image generation capabilities. Built with Coze Code (扣子编程) and deployed on the Coze platform.

## Commands

| Command | Purpose |
|---------|---------|
| `coze dev` | Start dev server (port 5000, hot reload via `tsx watch`) |
| `coze build` | Production build (`next build` + tsup server bundle) |
| `coze start` | Start production server |
| `pnpm install` | Install dependencies (pnpm only — npm/yarn are blocked) |
| `pnpm ts-check` | TypeScript type checking |

The dev script runs `pnpm tsx watch src/server.ts`, which starts a custom Node.js server on port 5000 wrapping Next.js.

## Architecture

**Single-page app**: `src/app/page.tsx` is the entire UI — character selection screen + chat interface, all client-side rendered (`'use client'`).

### API Routes (all POST, all use `coze-coding-dev-sdk`)

- **`/api/chat`** — LLM streaming (SSE) via `LLMClient`. Maintains in-memory conversation state per session (Map keyed by sessionId). 15-round sliding window (30 messages). Parses `[MEMORY: key=value]` and `[IMAGE: prompt]` directives from LLM output. Model: `doubao-seed-1-8-251228`.
- **`/api/tts`** — Text-to-speech via `TTSClient`. Each character has a distinct `voiceId`.
- **`/api/image`** — Image generation via `ImageGenerationClient`. Triggered every 5 rounds or by user keywords.

### Data Flow

1. User sends message → `/api/chat` streams LLM response via SSE
2. On stream complete, client fires parallel requests to `/api/tts` (always) and `/api/image` (if `[IMAGE:]` directive present)
3. Conversation state is in-memory only — page refresh clears everything

### Key Files

- `src/lib/characters.ts` — Character definitions (4 characters with personality, voice IDs, appearance prompts), system prompt generation, `UserMemory`/`Message` types, image trigger keywords
- `src/lib/cache.ts` — LRU cache instances for TTS (300 entries, 30min TTL), images (200 entries, 30min TTL), and system prompts (100 entries, 10min TTL)
- `src/server.ts` — Custom Node.js HTTP server wrapping Next.js (not using Next.js built-in server)
- `src/app/api/chat/route.ts` — Also exports `cleanReplyContent()` which strips action descriptions (`(微笑)`, `*sigh*`) and system directives from LLM output

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript 5
- shadcn/ui (new-york style) + Tailwind CSS v4
- `coze-coding-dev-sdk` for all AI capabilities (LLM, TTS, image generation)
- No database — all state is in-memory
- No user auth

## Conventions

- **Package manager**: pnpm only (enforced by `preinstall` script)
- **Path aliases**: `@/*` maps to `./src/*`
- **UI components**: Always prefer shadcn/ui from `src/components/ui/` before building custom
- **Hydration safety**: Never use `typeof window`, `Date.now()`, or `Math.random()` directly in JSX render logic. Use `'use client'` with `useEffect` + `useState` for dynamic values.
- **Styling**: Tailwind classes with `cn()` utility from `@/lib/utils` for conditional merging
