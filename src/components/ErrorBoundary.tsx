import { Component, type ReactNode, type ErrorInfo } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
    this.setState({ info });
    try {
      reportLovableError(error, { boundary: "app_error_boundary", stack: info.componentStack });
    } catch {
      /* noop */
    }
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { showAlert?: (m: string) => void } } })
        .Telegram?.WebApp;
      tg?.showAlert?.(`Ошибка: ${error.message.slice(0, 200)}`);
    } catch {
      /* noop */
    }
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      /* noop */
    }
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const isSecurityError =
      error.name === "SecurityError" || /SecurityError/i.test(error.message);

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "1.5rem",
          background: "var(--tg-theme-bg-color, #fafafa)",
          color: "var(--tg-theme-text-color, #111)",
          font: "15px/1.5 system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>
            Что-то пошло не так
          </h1>
          <p style={{ opacity: 0.8, margin: "0 0 1rem" }}>
            {isSecurityError
              ? "Браузер заблокировал доступ к локальному хранилищу. Отключите «Prevent Cross-Site Tracking» в настройках Telegram/Safari и попробуйте снова."
              : "Приложение столкнулось с непредвиденной ошибкой. Попробуйте перезагрузить."}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: 8,
              border: "none",
              background: "var(--tg-theme-button-color, #111)",
              color: "var(--tg-theme-button-text-color, #fff)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Перезагрузить
          </button>
          <details
            style={{
              marginTop: "1.5rem",
              textAlign: "left",
              fontSize: 12,
              opacity: 0.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            <summary style={{ cursor: "pointer" }}>Диагностика</summary>
            <div style={{ marginTop: 8 }}>
              <div>
                <b>{error.name}:</b> {error.message}
              </div>
              {error.stack && (
                <pre style={{ marginTop: 8, fontSize: 11 }}>
                  {error.stack.split("\n").slice(0, 6).join("\n")}
                </pre>
              )}
              {info?.componentStack && (
                <pre style={{ marginTop: 8, fontSize: 11 }}>
                  {info.componentStack.split("\n").slice(0, 6).join("\n")}
                </pre>
              )}
            </div>
          </details>
        </div>
      </div>
    );
  }
}
