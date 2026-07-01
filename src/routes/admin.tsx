import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Shield, ShieldOff, Gift, Search, Users, TrendingUp, ShoppingCart, Filter } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFunnelStats, getGrowthStats } from "@/lib/analytics.functions";
import {
  listRecentPurchases,
  lookupUser,
  adminGrantEntitlement,
  adminBanUser,
  adminRevokeEntitlementByCharge,
} from "@/lib/admin-ops.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Админка — Лила" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminPage() {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/", replace: true });
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/60" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-purple-300" />
          <h1 className="text-xl font-semibold">Админка Лилы</h1>
        </div>

        <Tabs defaultValue="funnel">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="funnel"><Filter className="w-4 h-4 mr-1" />Воронка</TabsTrigger>
            <TabsTrigger value="growth"><TrendingUp className="w-4 h-4 mr-1" />Рост</TabsTrigger>
            <TabsTrigger value="purchases"><ShoppingCart className="w-4 h-4 mr-1" />Покупки</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-1" />Пользователи</TabsTrigger>
          </TabsList>

          <TabsContent value="funnel"><FunnelTab /></TabsContent>
          <TabsContent value="growth"><GrowthTab /></TabsContent>
          <TabsContent value="purchases"><PurchasesTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------------- Funnel ---------------- */

function FunnelTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Awaited<ReturnType<typeof getFunnelStats>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getFunnelStats({ data: { days } })
      .then(setData)
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-white/60">Период:</span>
        {[7, 30, 90].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={days === d ? "default" : "outline"}
            onClick={() => setDays(d)}
          >
            {d}д
          </Button>
        ))}
      </div>
      {loading || !data ? (
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
      ) : (
        <div className="space-y-2">
          {data.steps.map((s, i) => {
            const prev = i === 0 ? s.users : data.steps[0].users;
            const width = prev > 0 ? Math.max(4, (s.users / prev) * 100) : 4;
            return (
              <div key={s.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{s.label}</span>
                  <span className="text-white/60">
                    {s.users.toLocaleString()} · {s.conv}%
                  </span>
                </div>
                <div className="h-6 bg-white/5 rounded overflow-hidden">
                  <div
                    className="h-full bg-purple-500/70"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ---------------- Growth ---------------- */

function GrowthTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getGrowthStats>> | null>(null);

  useEffect(() => {
    getGrowthStats().then(setData);
  }, []);

  if (!data) {
    return <Loader2 className="w-5 h-5 animate-spin text-white/50" />;
  }

  const cards: [string, string | number][] = [
    ["DAU (24ч)", data.dau],
    ["WAU (7д)", data.wau],
    ["MAU (30д)", data.mau],
    ["Revenue 7д", `${data.revenue7d} ⭐`],
    ["Revenue 30д", `${data.revenue30d} ⭐`],
    ["ARPPU 30д", `${data.arppu30d.toFixed(1)} ⭐`],
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map(([label, value]) => (
        <Card key={label} className="p-4 bg-white/5 border-white/10">
          <div className="text-xs uppercase text-white/50">{label}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Purchases ---------------- */

function PurchasesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await listRecentPurchases({ data: { limit: 100 } });
    setRows(data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const revoke = async (userId: string, chargeId: string) => {
    if (!confirm(`Отозвать доступ по charge ${chargeId.slice(0, 12)}…?`)) return;
    await adminRevokeEntitlementByCharge({ data: { userId, chargeId } });
    await load();
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-white/50" />;

  return (
    <Card className="p-2 bg-white/5 border-white/10 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-white/60 text-left">
          <tr>
            <th className="p-2">Когда</th>
            <th className="p-2">Продукт</th>
            <th className="p-2">⭐</th>
            <th className="p-2">User</th>
            <th className="p-2">Статус</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-white/5">
              <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-2">{r.product_id.replace(/^lila\./, "")}</td>
              <td className="p-2">{r.stars_amount}</td>
              <td className="p-2 font-mono text-xs">{r.user_id?.slice(0, 8)}</td>
              <td className="p-2">
                {r.refunded_at ? (
                  <span className="text-red-400">refunded</span>
                ) : (
                  <span className="text-green-400">active</span>
                )}
              </td>
              <td className="p-2">
                {!r.refunded_at && r.user_id && (
                  <Button size="sm" variant="ghost" onClick={() => revoke(r.user_id, r.telegram_payment_charge_id)}>
                    Отозвать
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="p-4 text-center text-white/40">Покупок пока нет.</td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

/* ---------------- Users ---------------- */

function UsersTab() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof lookupUser>> | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try { setResults(await lookupUser({ data: { query: q.trim() } })); }
    finally { setBusy(false); }
  };

  const grant = async (userId: string) => {
    await adminGrantEntitlement({ data: { targetUserId: userId, feature: "premium_all", days: 30 } });
    alert("Выдано: premium_all на 30 дней");
    await search();
  };
  const toggleBan = async (userId: string, banned: boolean) => {
    if (!confirm(banned ? "Забанить пользователя?" : "Снять бан?")) return;
    await adminBanUser({ data: { targetUserId: userId, banned } });
    await search();
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-white/5 border-white/10 flex gap-2">
        <Input
          placeholder="user_id (uuid) / telegram_id / display_name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
          className="bg-white/5 border-white/10"
        />
        <Button onClick={search} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </Card>

      {results && results.length === 0 && (
        <div className="text-white/40 text-sm text-center py-6">Ничего не найдено.</div>
      )}

      {results?.map((r) => (
        <Card key={r.profile.user_id} className="p-3 bg-white/5 border-white/10 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-xs text-white/50">{r.profile.user_id}</div>
              <div className="text-sm">
                {r.profile.display_name ?? "—"}
                {r.profile.telegram_id && (
                  <span className="text-white/40 ml-2">tg:{r.profile.telegram_id}</span>
                )}
              </div>
              <div className="text-xs text-white/50 mt-1">
                Куплено: <b>{r.totalStars} ⭐</b> · Регистрация: {new Date(r.profile.created_at).toLocaleDateString()}
              </div>
              {r.profile.banned_at && <div className="text-red-400 text-xs">Забанен {new Date(r.profile.banned_at).toLocaleString()}</div>}
              <div className="text-xs text-white/60 mt-1">
                Права: {r.entitlements.length ? r.entitlements.map((e: any) => `${e.feature_key}(${e.status})`).join(", ") : "—"}
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={() => grant(r.profile.user_id)}>
                <Gift className="w-3.5 h-3.5 mr-1" />+30д Premium
              </Button>
              <Button
                size="sm"
                variant={r.profile.banned_at ? "outline" : "destructive"}
                onClick={() => toggleBan(r.profile.user_id, !r.profile.banned_at)}
              >
                {r.profile.banned_at ? (<><Shield className="w-3.5 h-3.5 mr-1" />Снять бан</>) : (<><ShieldOff className="w-3.5 h-3.5 mr-1" />Бан</>)}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
