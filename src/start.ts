import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { supabase } from "@/lib/supabase-safe-client";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
// NOTE: generated attachSupabaseAuth намеренно НЕ используется — он падает
// в iOS WKWebView (SecurityError из localStorage). См. audit P0-2.

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const attachSafeSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch (error) {
    console.warn("[auth] bearer attach skipped", error);
    return next({ headers: {} });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, attachSafeSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
