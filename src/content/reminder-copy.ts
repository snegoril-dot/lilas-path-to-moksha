/**
 * Тексты напоминаний о завершении практики клетки.
 * Пишутся мягко: приглашение, а не давление.
 */

export interface ReminderCopy {
  title: string;
  body: string;
}

const DUE_SOON: ReminderCopy[] = [
  {
    title: "🕯 Практика подходит к завершению",
    body: "Как ты сейчас? Клетка {cell} — «{cellName}» ждёт краткого возвращения и заметки.",
  },
  {
    title: "🌿 Тихое напоминание",
    body: "Ты в практике клетки {cell}. Загляни в приложение — там место для одной честной строки.",
  },
];

const DUE_NOW: ReminderCopy[] = [
  {
    title: "🪷 Круг практики завершён",
    body: "Клетка {cell} — «{cellName}». Возвращайся, когда сможешь: одна фраза-инсайт, шкала резонанса — и путь продолжится.",
  },
  {
    title: "✨ Можно закрывать круг",
    body: "Время практики прошло. Не спеши: важнее то, что ты заметил, чем скорость. Открой Лилу и подведи итог.",
  },
];

export function pickReminderCopy(
  kind: "due_soon" | "due_now",
  cellId: number,
  cellName: string,
): ReminderCopy {
  const pool = kind === "due_soon" ? DUE_SOON : DUE_NOW;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    title: pick.title,
    body: pick.body.replaceAll("{cell}", String(cellId)).replaceAll("{cellName}", cellName),
  };
}
