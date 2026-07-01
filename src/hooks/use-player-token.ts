import { useCallback, useEffect, useState } from "react";
import { PLAYER_TOKENS, DEFAULT_TOKEN_ID, getToken } from "@/lib/player-tokens";
import { safeGet, safeSet } from "@/lib/safe-storage";

const KEY = "lila.token";

export function usePlayerToken() {
  const [tokenId, setTokenId] = useState<string>(() => safeGet(KEY) ?? DEFAULT_TOKEN_ID);

  useEffect(() => {
    safeSet(KEY, tokenId);
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
