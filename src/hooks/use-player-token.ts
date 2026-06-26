import { useCallback, useEffect, useState } from "react";
import { PLAYER_TOKENS, DEFAULT_TOKEN_ID, getToken } from "@/lib/player-tokens";

const KEY = "lila.token";

export function usePlayerToken() {
  const [tokenId, setTokenId] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_TOKEN_ID;
    return window.localStorage.getItem(KEY) ?? DEFAULT_TOKEN_ID;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, tokenId);
  }, [tokenId]);

  const cycle = useCallback(() => {
    setTokenId((cur) => {
      const idx = PLAYER_TOKENS.findIndex((t) => t.id === cur);
      const next = PLAYER_TOKENS[(idx + 1) % PLAYER_TOKENS.length];
      return next.id;
    });
  }, []);

  return { token: getToken(tokenId), tokenId, setTokenId, cycle };
}
