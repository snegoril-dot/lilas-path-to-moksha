// Lightweight client error logger. Fire-and-forget.
// Captures window.onerror + unhandledrejection into analytics_events
// as `client_error`. No user text, no stack args — only message + first
// stack frame + url. Safe replacement for Sentry until we wire a real SDK.

import { trackEvent } from "./analytics";

let installed = false;

function shortStack(stack: string | undefined): string {
  if (!stack) return "";
  return stack.split("\n").slice(0, 3).join(" | ").slice(0, 400);
}

function log(kind: "error" | "unhandledrejection", message: string, stack?: string) {
  trackEvent("client_error", {
    extra: {
      kind,
      // message capped short — never carries user PII, but stay defensive
      msg: message.slice(0, 240),
      stack: shortStack(stack),
      path: typeof location !== "undefined" ? location.pathname.slice(0, 80) : "",
    },
  });
  // eslint-disable-next-line no-console
  console.error(`[client_error:${kind}]`, message);
}

export function installErrorLogger(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    const err = e.error as Error | undefined;
    log("error", err?.message ?? e.message ?? "unknown", err?.stack);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "unhandled_rejection";
    const stack = reason instanceof Error ? reason.stack : undefined;
    log("unhandledrejection", message, stack);
  });
}
