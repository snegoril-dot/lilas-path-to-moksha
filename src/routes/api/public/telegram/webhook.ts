/**
 * Telegram bot webhook for "Лила — Путь к Мокше".
 *
 * Handles three commands:
 *   /start     — welcome + "Открыть Лилу" button (Mini App)
 *   /continue  — encouragement + same button
 *   /help      — how to play + disclaimer
 *
 * Configuration:
 *   TELEGRAM_BOT_TOKEN          — from @BotFather (server-only secret)
 *   MINI_APP_URL                — https URL of the Mini App
 *   TELEGRAM_WEBHOOK_SECRET     — optional; if set, verified against the
 *                                 `X-Telegram-Bot-Api-Secret-Token` header.
 *
 * Register the webhook once from any shell:
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *     -d "url=https://<host>/api/public/telegram/webhook" \
 *     -d "secret_token=<your-secret>"
 */
import { createFileRoute } from "@tanstack/react-router";

const TELEGRAM_API = "https://api.telegram.org";

interface TgChat { id: number; type: string }
interface TgUser { id: number; first_name?: string; language_code?: string }
interface TgMessage { message_id: number; chat: TgChat; from?: TgUser; text?: string }
interface TgUpdate { update_id: number; message?: TgMessage; edited_message?: TgMessage }

function ok(extra: Record<string, unknown> = {}) {
  return Response.json({ ok: true, ...extra });
}

function miniAppKeyboard(miniAppUrl: string, label = "🕉 Открыть Лилу", extraParam?: string) {
  const url = extraParam
    ? `${miniAppUrl}${miniAppUrl.includes("?") ? "&" : "?"}startapp=${encodeURIComponent(extraParam)}`
    : miniAppUrl;
  // `web_app` opens inside Telegram as a Mini App.
  return {
    inline_keyboard: [[{ text: label, web_app: { url } }]],
  };
}

async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: unknown,
) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("telegram sendMessage failed", res.status, body);
  }
}

const WELCOME = `🕉 <b>Добро пожаловать в Lila’s Path to Moksha.</b>

Это цифровой путь Лилы — игра-созерцание, где клетки, змеи, лестницы и твои собственные инсайты помогают взглянуть на Санкальпу глубже.

Нажми кнопку ниже, чтобы войти в путь.`;

const CONTINUE = `🌿 Если путь уже начат, ты можешь вернуться к нему и продолжить с того места, где остановился.`;

const JOURNAL = `📓 <b>Дневник пути</b>

В дневнике собираются твои инсайты — заметки, которые ты оставляешь на ключевых клетках. Открой Мини-приложение, чтобы посмотреть их.`;

const HELP = `📜 <b>Как играть в Лилу</b>

• <b>Что это</b> — классическая индийская игра-медитация (Джнана Лила): путь души через 72 состояния сознания к Мокше.
• <b>Санкальпа</b> — намерение или вопрос, с которым ты входишь в игру. Чем честнее вопрос, тем яснее ответ.
• <b>Кубик и клетки</b> — каждый бросок ведёт на новую клетку. В игру ты входишь, выбросив шестёрку. Каждая клетка — маленькое зеркало и приглашение к размышлению.
• <b>Змеи и лестницы</b> — не наказание и не награда, а мягкие подсказки: что тянет вниз и что поднимает выше.

Команды:
/start — начать заново
/continue — продолжить путь
/journal — открыть дневник
/help — эта справка

⚠️ Лила — это <b>рефлексивная практика</b>, а не гадание и не замена медицинской, психологической или психотерапевтической помощи. Если тебе тяжело — обратись к специалисту.`;

async function handleCommand(
  token: string,
  miniAppUrl: string,
  msg: TgMessage,
): Promise<void> {
  const text = (msg.text ?? "").trim();
  // Strip @botname suffix that Telegram appends in groups.
  const cmd = text.split(/\s+/)[0].split("@")[0].toLowerCase();

  switch (cmd) {
    case "/start":
      await sendMessage(token, msg.chat.id, WELCOME, miniAppKeyboard(miniAppUrl));
      return;
    case "/continue":
      await sendMessage(
        token,
        msg.chat.id,
        CONTINUE,
        miniAppKeyboard(miniAppUrl, "▶️ Продолжить путь"),
      );
      return;
    case "/journal":
      await sendMessage(
        token,
        msg.chat.id,
        JOURNAL,
        miniAppKeyboard(miniAppUrl, "📓 Открыть дневник", "journal"),
      );
      return;
    case "/help":
      await sendMessage(token, msg.chat.id, HELP, miniAppKeyboard(miniAppUrl));
      return;
    default:
      // Any other text: gently redirect to the Mini App.
      await sendMessage(
        token,
        msg.chat.id,
        "Открой игру кнопкой ниже или используй /help.",
        miniAppKeyboard(miniAppUrl),
      );
  }
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      GET: async () =>
        new Response("Telegram webhook is live. POST-only.", { status: 200 }),

      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const miniAppUrl = process.env.MINI_APP_URL;
        if (!token || !miniAppUrl) {
          console.error("telegram webhook: missing TELEGRAM_BOT_TOKEN or MINI_APP_URL");
          // Return 200 so Telegram doesn't retry forever while we fix config.
          return ok({ configured: false });
        }

        // Optional shared secret from setWebhook(secret_token=...).
        const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
        if (expectedSecret) {
          const got = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
          if (got !== expectedSecret) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        let update: TgUpdate;
        try {
          update = (await request.json()) as TgUpdate;
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        const msg = update.message ?? update.edited_message;
        if (!msg?.chat?.id) return ok({ ignored: true });

        try {
          await handleCommand(token, miniAppUrl, msg);
        } catch (err) {
          console.error("telegram handleCommand error", err);
        }
        return ok();
      },
    },
  },
});
