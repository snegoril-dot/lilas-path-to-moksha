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
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { findProductById } from "@/lib/entitlements";

const TELEGRAM_API = "https://api.telegram.org";

interface TgChat { id: number; type: string }
interface TgUser { id: number; first_name?: string; language_code?: string }
interface TgSuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
}
interface TgMessage {
  message_id: number;
  chat: TgChat;
  from?: TgUser;
  text?: string;
  successful_payment?: TgSuccessfulPayment;
}
interface TgPreCheckoutQuery {
  id: string;
  from: TgUser;
  currency: string;
  total_amount: number;
  invoice_payload: string;
}
interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
  pre_checkout_query?: TgPreCheckoutQuery;
}


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

async function handleSuccessfulPayment(token: string, msg: TgMessage): Promise<void> {
  const pay = msg.successful_payment;
  if (!pay) return;
  const [productId, userId] = (pay.invoice_payload ?? "").split(":");
  const product = findProductById(productId ?? "");
  if (!product || !userId) {
    console.error("stars payment: unknown product or userId", pay.invoice_payload);
    return;
  }

  // Идемпотентность: telegram_payment_charge_id уникален.
  const { data: existing } = await supabaseAdmin
    .from("stars_payments")
    .select("id")
    .eq("telegram_payment_charge_id", pay.telegram_payment_charge_id)
    .maybeSingle();
  if (existing) return;

  const { error: payErr } = await supabaseAdmin.from("stars_payments").insert({
    user_id: userId,
    telegram_user_id: msg.from?.id ?? null,
    product_id: product.id,
    stars_amount: pay.total_amount,
    telegram_payment_charge_id: pay.telegram_payment_charge_id,
    provider_payment_charge_id: pay.provider_payment_charge_id ?? null,
    invoice_payload: pay.invoice_payload,
    raw_payload: JSON.parse(JSON.stringify(pay)),
  });
  if (payErr) {
    console.error("stars payment insert failed", payErr);
    return;
  }

  const rows = product.features.map((feature) => ({
    user_id: userId,
    feature,
    status: "active",
    source: "stars",
    product_id: product.id,
    stars_charge_id: pay.telegram_payment_charge_id,
  }));
  const { error: entErr } = await supabaseAdmin
    .from("user_entitlements")
    .upsert(rows, { onConflict: "user_id,feature" });
  if (entErr) {
    console.error("entitlements upsert failed", entErr);
    return;
  }

  await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: msg.chat.id,
      text: `🕉 Спасибо! «${product.title}» открыт. Возвращайся в путь — новые возможности уже доступны.`,
      parse_mode: "HTML",
    }),
  });
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

        // --- Telegram Stars: pre_checkout_query ---
        if (update.pre_checkout_query) {
          const q = update.pre_checkout_query;
          const [productId] = (q.invoice_payload ?? "").split(":");
          const product = findProductById(productId ?? "");
          const okay =
            !!product && q.currency === "XTR" && q.total_amount === product.stars;
          await fetch(`${TELEGRAM_API}/bot${token}/answerPreCheckoutQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pre_checkout_query_id: q.id,
              ok: okay,
              error_message: okay ? undefined : "Продукт недоступен, попробуй позже.",
            }),
          });
          return ok();
        }

        const msg = update.message ?? update.edited_message;
        if (!msg?.chat?.id) return ok({ ignored: true });

        // --- Telegram Stars: successful_payment ---
        if (msg.successful_payment) {
          try {
            await handleSuccessfulPayment(token, msg);
          } catch (err) {
            console.error("telegram successful_payment error", err);
          }
          return ok();
        }

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
