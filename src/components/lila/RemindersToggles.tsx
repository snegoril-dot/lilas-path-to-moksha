import { useEffect, useState } from "react";
import { BellRing, BellOff, Sun } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getReminderPrefs, setReminderPrefs } from "@/lib/reminders.functions";

/**
 * Секция «Напоминания о практике» в SettingsSheet.
 * Два тумблера: напоминания о завершении практики и утренняя Санкальпа.
 */
export function RemindersToggles() {
  const getPrefs = useServerFn(getReminderPrefs);
  const setPrefs = useServerFn(setReminderPrefs);

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [morning, setMorning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prefs = await getPrefs({ data: {} });
        if (cancelled) return;
        setEnabled(Boolean(prefs.enabled));
        setMorning(Boolean(prefs.morningSankalpaEnabled));
      } catch {
        /* тихо: гость / оффлайн */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getPrefs]);

  const toggle = async (key: "enabled" | "morningSankalpaEnabled", value: boolean) => {
    if (key === "enabled") setEnabled(value);
    else setMorning(value);
    try {
      await setPrefs({ data: { [key]: value } });
    } catch {
      // откат
      if (key === "enabled") setEnabled(!value);
      else setMorning(!value);
    }
  };

  return (
    <div className="space-y-2">
      <p className="opacity-75 text-[13px]">
        Тихие приглашения от Гуру. Присылаются в Telegram, только когда есть активная практика или наступил новый день.
      </p>

      <ToggleRow
        icon={enabled ? <BellRing size={16} /> : <BellOff size={16} />}
        label="Напоминания о завершении практики"
        hint="Одно мягкое сообщение, когда круг практики подходит к концу"
        checked={enabled}
        disabled={loading}
        onChange={(v) => toggle("enabled", v)}
      />
      <ToggleRow
        icon={<Sun size={16} />}
        label="Утренняя Санкальпа"
        hint="Короткое приглашение вернуть внимание к намерению дня"
        checked={morning}
        disabled={loading}
        onChange={(v) => toggle("morningSankalpaEnabled", v)}
      />
    </div>
  );
}

function ToggleRow({
  icon, label, hint, checked, disabled, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ring-1 ${
        checked
          ? "bg-amber-500/15 text-amber-100 ring-amber-400/30"
          : "bg-white/5 hover:bg-white/10 ring-white/10"
      } ${disabled ? "opacity-60" : ""}`}
      aria-pressed={checked}
    >
      <span className="h-8 w-8 grid place-items-center rounded-lg bg-white/10 shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-[11px] opacity-70">{hint}</span>}
      </span>
      <span
        className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-amber-400/70" : "bg-white/15"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
