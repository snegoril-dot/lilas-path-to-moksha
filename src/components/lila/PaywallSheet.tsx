import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Sparkles, Check, RefreshCw, Loader2 } from "lucide-react";
import { STARS_PRODUCTS, type FeatureId, type StarsProduct, type UserEntitlements } from "@/lib/entitlements";
import { listEntitlements, restorePurchases, createStarsInvoice } from "@/lib/entitlements.functions";

function haptic(type: "success" | "error" | "light") {
  const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : undefined;
  try {
    if (type === "light") tg?.HapticFeedback?.impactOccurred?.("light");
    else tg?.HapticFeedback?.notificationOccurred?.(type);
  } catch { /* noop */ }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRODUCT_LIST: StarsProduct[] = [
  STARS_PRODUCTS.DEEP_GURU_PACK,
  STARS_PRODUCTS.PATH_ANALYSIS,
  STARS_PRODUCTS.PREMIUM_ALL,
];

function openTelegramInvoice(url: string, onPaid?: () => void): void {
  const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : undefined;
  if (tg?.openInvoice) {
    tg.openInvoice(url, (status: string) => {
      if (status === "paid") onPaid?.();
    });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function PaywallSheet({ open, onClose }: Props) {
  const [ent, setEnt] = useState<UserEntitlements | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEntitlements({ data: {} });
      setEnt(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить покупки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  const isActive = (features: FeatureId[]) =>
    !!ent && features.every((f) => ent.features?.[f]?.active);

  const onBuy = async (product: StarsProduct) => {
    setBusyId(product.id);
    setError(null);
    try {
      haptic("light");
      const { url } = await createStarsInvoice({ data: { productId: product.id } });
      openTelegramInvoice(url, async () => {
        haptic("success");
        // После оплаты webhook начислит entitlements. Дождёмся и перечитаем.
        setTimeout(() => void refresh(), 1500);
      });
    } catch (e) {
      haptic("error");
      setError(e instanceof Error ? e.message : "Не удалось открыть оплату");
    } finally {
      setBusyId(null);
    }
  };

  const onRestore = async () => {
    setBusyId("__restore");
    setError(null);
    try {
      const data = await restorePurchases({ data: {} });
      setEnt(data);
      haptic("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось восстановить покупки");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Открой путь глубже
          </SheetTitle>
          <SheetDescription>
            Оплата — звёздами Telegram. Ты поддерживаешь развитие Лилы и открываешь
            практики, которые ведут глубже.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {PRODUCT_LIST.map((p) => {
            const active = isActive(p.features);
            const busy = busyId === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-4 ${
                  active
                    ? "border-amber-400/40 bg-amber-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{p.title}</div>
                    <p className="text-sm text-white/70 mt-1">{p.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {active ? (
                      <span className="inline-flex items-center gap-1 text-amber-300 text-sm">
                        <Check className="h-4 w-4" /> Открыт
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || loading}
                        onClick={() => onBuy(p)}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-black text-sm font-medium px-3 py-1.5 disabled:opacity-60"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Открыть за {p.stars} ⭐</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onRestore}
            disabled={busyId === "__restore"}
            className="inline-flex items-center gap-1 text-white/70 hover:text-white"
          >
            {busyId === "__restore" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Восстановить покупки
          </button>
          <span className="text-white/50">
            {ent?.isPremium ? "Полный доступ активен" : "Оплата через Telegram Stars"}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
