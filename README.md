# Lila's Path to Moksha

Telegram Mini App implementation of the classical Indian self-knowledge game **Leela / Gyan Chaupar** (72 cells, snakes and arrows) with an AI Guru companion.

## Features

- 9×8 board (72 cells) with authentic Harish Johari layout, 8 arrows and 9 snakes
- 3D dice with entry-by-six rule, three-sixes cancellation and "grace six" after 3 failed tries
- Sankalpa (intention) input and reflection prompts after every snake/arrow
- AI Guru chat (Lovable AI Gateway) aware of your current cell, loka and Sankalpa
- Daily card, achievements, karma journal, shareable result art card
- Telegram Web App SDK integration: theme, haptics, MainButton, `switchInlineQuery` sharing
- Sound (WebAudio gong), accessibility (aria-live, focus trap), reduced-motion support
- Anonymous auth + per-user game history stored in Lovable Cloud

## Tech stack

- Vite 7 + React 19 + TypeScript
- TanStack Start / Router (file-based routing, server functions)
- Tailwind CSS v4, shadcn/ui, Framer Motion, Lucide icons
- Lovable Cloud (Supabase: Postgres + Auth + RLS)
- Lovable AI Gateway (Gemini) via Vercel AI SDK
- Vitest + Playwright for tests

## Run locally

```bash
bun install
cp .env.example .env      # fill values, see below
bun dev                   # http://localhost:8080
```

Other scripts: `bun run build`, `bun run test`, `bunx playwright test`.

## Environment variables

See [`.env.example`](./.env.example).

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | client | Backend URL exposed to the browser |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Publishable (anon) key |
| `SUPABASE_URL` | server | Same URL, used by SSR / server functions |
| `SUPABASE_PUBLISHABLE_KEY` | server | Same publishable key for SSR |
| `LOVABLE_API_KEY` | server | AI Gateway auth (auto-provisioned on Lovable Cloud) |
| `TELEGRAM_BOT_TOKEN` | server | Only needed if you host the Telegram bot yourself |

On Lovable Cloud these are injected automatically — you do not need a local `.env` when developing inside the platform.

## Telegram Mini App setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. `/newapp` → attach the bot → set the Web App URL to your published site (e.g. `https://<your-project>.lovable.app`).
3. Set a menu button: `/setmenubutton` → your bot → same URL.
4. (Optional) Store `TELEGRAM_BOT_TOKEN` as a server secret if you add server-side Telegram API calls.
5. Open the bot in Telegram → tap the menu button. The app reads `window.Telegram.WebApp` for theme, viewport, haptics and sharing.

## Roadmap

- PDF export of a played game (path + Guru commentary)
- Realtime multiplayer rooms (2–4 players) via Lovable Cloud channels
- Voice Guru (TTS) and voice questions (STT)
- Paid tier: extended Guru sessions, weekly reflections, printable art card
- Localisation beyond RU/EN

## Security

Never commit secrets. In particular:

- `.env` and any `.env.*` file (they are gitignored)
- Telegram bot token
- Supabase **service role** key (not used by this app; do not add it)
- Any AI provider key, including `LOVABLE_API_KEY`

Only the `VITE_*` publishable keys are safe in the client bundle — everything else must stay server-side. If a secret is ever pushed by accident, rotate it immediately.
