/**
 * Флаг режима разработки. В prod-сборке (`import.meta.env.PROD`) равен `false`
 * — все дебаг-инструменты, seed из URL и window-хелперы отключены.
 * В dev и в тестах (vitest) — `true`.
 */
export const IS_DEV: boolean = !import.meta.env.PROD;
