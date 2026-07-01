import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, Receipt, RefreshCw } from "lucide-react";
import { listMyPurchases } from "@/lib/entitlements.functions";
import { findProductById } from "@/lib/entitlements";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PurchaseRow {
  id: string;
  product_id: string;
  stars_amount: number;
  telegram_payment_charge_id: string;
  created_at: string;
  refunded_at: string | null;
}

export function MyPurchasesSheet({ open, onClose }: Props) {
  const [rows, setRows] = useState<PurchaseRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMyPurchases({ data: {} });
      setRows((data ?? []) as PurchaseRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить историю");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Мои покупки
          </SheetTitle>
          <SheetDescription>
            История оплат звёздами Telegram. Возвраты закрывают доступ автоматически.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-sm opacity-70">
              <Loader2 className="h-4 w-4 animate-spin" /> Загружаем…
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-red-300" role="alert">{error}</p>
          )}

          {!loading && !error && rows && rows.length === 0 && (
            <p className="text-sm opacity-70">Покупок пока нет.</p>
          )}

          {!loading && rows && rows.length > 0 && (
            <ul className="space-y-2">
              {rows.map((r) => {
                const product = findProductById(r.product_id);
                const refunded = !!r.refunded_at;
                return (
                  <li
                    key={r.id}
                    className={`rounded-xl p-3 ring-1 ${
                      refunded
                        ? "bg-white/5 ring-white/10 opacity-70"
                        : "bg-white/[0.04] ring-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {product?.title ?? r.product_id}
                        </div>
                        <div className="text-xs opacity-60 mt-0.5">
                          {new Date(r.created_at).toLocaleString("ru-RU")}
                        </div>
                        {refunded && (
                          <div className="text-xs text-amber-300 mt-1">
                            Возврат: {new Date(r.refunded_at!).toLocaleDateString("ru-RU")}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-sm tabular-nums">
                        {r.stars_amount} ⭐
                      </div>
                    </div>
                    <div className="text-[10px] opacity-40 mt-2 break-all">
                      {r.telegram_payment_charge_id}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm opacity-70 hover:opacity-100 disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" /> Обновить
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
