type DiagnosticAuthState = {
  authReady?: boolean;
  userId?: string | null;
  stage?: string;
  timedOut?: boolean;
  hasSession?: boolean;
  anonAttempted?: boolean;
  anonOk?: boolean;
  securityError?: boolean;
  lastError?: string | null;
};

type DiagnosticEvent = {
  t: string;
  kind: string;
  message: string;
  data?: Record<string, unknown>;
};

const MAX_EVENTS = 30;
const events: DiagnosticEvent[] = [];
let authState: DiagnosticAuthState = { authReady: false, userId: null, stage: "init" };

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 8).join("\n") ?? null,
      securityError: error.name === "SecurityError" || /SecurityError|storage/i.test(error.message),
    };
  }
  const message = typeof error === "string" ? error : JSON.stringify(error ?? "unknown");
  return {
    name: "NonError",
    message: message.slice(0, 500),
    stack: null,
    securityError: /SecurityError|storage/i.test(message),
  };
}

function safeConsole(kind: "info" | "warn" | "error", message: string, data?: unknown) {
  try {
    // eslint-disable-next-line no-console
    console[kind](`[lila:${kind}] ${message}`, data ?? "");
  } catch {
    /* noop */
  }
}

export function recordDiagnostic(kind: string, message: string, data?: Record<string, unknown>) {
  const event = { t: new Date().toISOString(), kind, message, data } satisfies DiagnosticEvent;
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
  safeConsole(kind === "error" ? "error" : "info", `${kind}: ${message}`, data);
}

export function setAuthDiagnosticState(next: Partial<DiagnosticAuthState>) {
  authState = { ...authState, ...next };
  recordDiagnostic("auth_status", authState.stage ?? "auth", {
    authReady: !!authState.authReady,
    hasUser: !!authState.userId,
    timedOut: !!authState.timedOut,
    hasSession: !!authState.hasSession,
    anonAttempted: !!authState.anonAttempted,
    anonOk: !!authState.anonOk,
    securityError: !!authState.securityError,
    lastError: authState.lastError ?? null,
  });
}

export function getAuthDiagnosticState() {
  return { ...authState };
}

export function sendTelegramDiagnostic(reason: string, error?: unknown, extra: Record<string, unknown> = {}) {
  if (!isBrowser()) return false;
  const normalized = normalizeError(error);
  const payload = {
    type: "lila_error_report",
    reason,
    at: new Date().toISOString(),
    path: window.location.pathname,
    userAgent: navigator.userAgent.slice(0, 180),
    error: normalized,
    auth: {
      ...authState,
      userId: authState.userId ? `${authState.userId.slice(0, 8)}…` : null,
      authReady: !!authState.authReady,
    },
    events: events.slice(-12),
    extra,
  };

  try {
    const tg = (window as unknown as {
      Telegram?: { WebApp?: { sendData?: (data: string) => void } };
    }).Telegram?.WebApp;
    if (!tg?.sendData) return false;
    tg.sendData(JSON.stringify(payload).slice(0, 3900));
    return true;
  } catch (e) {
    safeConsole("warn", "telegram sendData failed", normalizeError(e));
    return false;
  }
}

export function reportClientCrash(reason: string, error: unknown, extra?: Record<string, unknown>) {
  const normalized = normalizeError(error);
  recordDiagnostic("error", reason, {
    name: normalized.name,
    message: normalized.message,
    securityError: normalized.securityError,
    ...extra,
  });
  sendTelegramDiagnostic(reason, error, extra);
}
