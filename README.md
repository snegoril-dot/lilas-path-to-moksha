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
| `TELEGRAM_BOT_TOKEN` | server | Bot token from @BotFather (webhook auth) |
| `MINI_APP_URL` | server | HTTPS URL of the deployed Mini App |
| `TELEGRAM_WEBHOOK_SECRET` | server | Optional shared secret verified on the webhook |

On Lovable Cloud these are injected automatically — you do not need a local `.env` when developing inside the platform.

## Telegram Mini App setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. `/newapp` → attach the bot → set the Web App URL to your published site (e.g. `https://<your-project>.lovable.app`).
3. Set a menu button: `/setmenubutton` → your bot → same URL.
4. Open the bot in Telegram → tap the menu button. The app reads `window.Telegram.WebApp` for theme, viewport, haptics and sharing.

## Telegram bot (`/start`, `/continue`, `/help`)

The bot is a **stateless webhook** — no long-lived process is needed, which
fits the serverless runtime of this project. The handler lives at
[`src/routes/api/public/telegram/webhook.ts`](src/routes/api/public/telegram/webhook.ts)
and answers three commands with a "Открыть Лилу" button that launches the Mini App.

### Configure

Store as **server** secrets (never expose to the client):

- `TELEGRAM_BOT_TOKEN` — from @BotFather
- `MINI_APP_URL` — e.g. `https://lilas-path-to-moksha.lovable.app`
- `TELEGRAM_WEBHOOK_SECRET` — optional; any random string

### Register the webhook (one-time)

```bash
# Pick a random secret and remember it
SECRET="$(openssl rand -hex 24)"

curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=https://<your-project>.lovable.app/api/public/telegram/webhook" \
  --data-urlencode "secret_token=${SECRET}" \
  --data-urlencode 'allowed_updates=["message"]'

# Verify
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Then save `SECRET` as `TELEGRAM_WEBHOOK_SECRET`.

### Set command hints in Telegram

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands" \
  -H 'Content-Type: application/json' \
  -d '{"commands":[
    {"command":"start","description":"Начать путь"},
    {"command":"continue","description":"Продолжить путь"},
    {"command":"help","description":"Как играть"}
  ]}'
```


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

## Privacy: analytics

The app records lightweight product-analytics events (see `src/lib/analytics.ts`) such as `app_opened`, `dice_rolled`, `cell_landed`, `snake_triggered`, `ladder_triggered`, `moksha_reached`, `guru_opened`, `session_paused/resumed`, `share_completed`, etc. Events are written to the `analytics_events` table via RLS-restricted inserts and fail silently — analytics never blocks gameplay.

**We never store** your Sankalpa text, reflection notes, Guru chat messages, or journal entries in analytics. Only non-sensitive metadata is captured: event name, current cell id, dice value, session/anon id, platform (telegram/browser), and app version.
