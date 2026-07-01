/**
 * Шаблоны текста для шеринга в Telegram.
 *
 * ⚠️ Формулировки и логика — в `src/lib/share.ts`. Здесь только ре-экспорт
 * и место для новых шаблонов, если появятся.
 */

export {
  buildShareText,
  shareToTelegram,
  type ShareResult,
  type ShareOutcome,
  type BuildShareTextInput,
} from "@/lib/share";
