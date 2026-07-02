import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { safeStorageAdapter } from "@/lib/safe-storage";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function readServerEnv(name: string): string | undefined {
  return (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

function createSafeSupabaseClient() {
  // Static access lets Vite inline these at build time for the client bundle.
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL || readServerEnv("SUPABASE_URL") || readServerEnv("VITE_SUPABASE_URL");
  const supabaseKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    readServerEnv("SUPABASE_PUBLISHABLE_KEY") ||
    readServerEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    const missing = [!supabaseUrl ? "SUPABASE_URL" : null, !supabaseKey ? "SUPABASE_PUBLISHABLE_KEY" : null]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Missing backend environment variable(s): ${missing}`);
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: { fetch: createSupabaseFetch(supabaseKey) },
    auth: {
      storage: typeof window === "undefined" ? undefined : safeStorageAdapter,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let client: ReturnType<typeof createSafeSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSafeSupabaseClient>, {
  get(_, prop, receiver) {
    if (!client) client = createSafeSupabaseClient();
    return Reflect.get(client, prop, receiver);
  },
});