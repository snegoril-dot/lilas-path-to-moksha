import type { KeyCell } from "@/components/lila/WinOverlay";

export interface ArtCardData {
  sankalpa?: string;
  totalRolls?: number;
  keyCells?: KeyCell[];
}

const W = 1080;
const H = 1080;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Рисует итоговую арт-карточку 1080×1080 (квадрат — удобно делиться в TG).
 */
export async function renderArtCard(data: ArtCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Фон — радиальный градиент «закатное небо над Кайласом».
  const bg = ctx.createRadialGradient(W / 2, H * 0.35, 100, W / 2, H / 2, W);
  bg.addColorStop(0, "#6b3e15");
  bg.addColorStop(0.5, "#2a1a3a");
  bg.addColorStop(1, "#0e0a1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Едва заметные «звёзды» (детерминированные).
  ctx.fillStyle = "rgba(255,220,150,0.35)";
  for (let i = 0; i < 80; i++) {
    const x = ((i * 9301 + 49297) % 233280) / 233280 * W;
    const y = ((i * 16807) % 233280) / 233280 * H * 0.55;
    const r = ((i * 7) % 3) + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Рамка
  ctx.strokeStyle = "rgba(251,191,36,0.45)";
  ctx.lineWidth = 4;
  roundRect(ctx, 32, 32, W - 64, H - 64, 36);
  ctx.stroke();

  // Заголовок 🕉 + «Лила · Мокша»
  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 120px serif";
  ctx.textAlign = "center";
  ctx.fillText("🕉", W / 2, 200);

  ctx.font = "bold 64px Georgia, serif";
  const grad = ctx.createLinearGradient(0, 220, 0, 290);
  grad.addColorStop(0, "#fcd34d");
  grad.addColorStop(1, "#f59e0b");
  ctx.fillStyle = grad;
  ctx.fillText("Лила · Мокша", W / 2, 290);

  ctx.font = "300 26px Georgia, serif";
  ctx.fillStyle = "rgba(253,230,138,0.7)";
  ctx.fillText("Игра Самопознания", W / 2, 330);

  let cursorY = 410;

  // Санкальпа
  if (data.sankalpa) {
    ctx.font = "italic 600 32px Georgia, serif";
    ctx.fillStyle = "#fef3c7";
    ctx.textAlign = "center";
    const lines = wrap(ctx, `«${data.sankalpa}»`, W - 220);
    for (const ln of lines.slice(0, 4)) {
      ctx.fillText(ln, W / 2, cursorY);
      cursorY += 42;
    }
    ctx.font = "300 18px sans-serif";
    ctx.fillStyle = "rgba(253,230,138,0.55)";
    ctx.fillText("МОЯ САНКАЛЬПА", W / 2, cursorY + 8);
    cursorY += 60;
  }

  // Путь — ключевые клетки
  const cells = (data.keyCells ?? []).slice(0, 6);
  if (cells.length > 0) {
    ctx.font = "300 18px sans-serif";
    ctx.fillStyle = "rgba(253,230,138,0.55)";
    ctx.textAlign = "center";
    ctx.fillText("ПУТЬ ДУШИ", W / 2, cursorY);
    cursorY += 36;

    ctx.font = "500 26px Georgia, serif";
    ctx.textAlign = "left";
    const left = 120;
    for (const c of cells) {
      const icon = c.kind === "ladder" ? "🪜" : "🐍";
      const label = `${icon}  ${c.id}. ${c.name}`;
      ctx.fillStyle = c.kind === "ladder" ? "#bbf7d0" : "#fecaca";
      const lines = wrap(ctx, label, W - 240);
      ctx.fillText(lines[0], left, cursorY);
      cursorY += 40;
      if (cursorY > H - 200) break;
    }
    cursorY += 12;
  }

  // Нижняя плашка — кол-во ходов
  const footerY = H - 110;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, 80, footerY - 40, W - 160, 90, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(251,191,36,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, 80, footerY - 40, W - 160, 90, 28);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "bold 32px Georgia, serif";
  ctx.fillStyle = "#fde68a";
  const rolls = typeof data.totalRolls === "number" ? data.totalRolls : "—";
  ctx.fillText(`${rolls} бросков до Кайласа`, W / 2, footerY + 20);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png"
    );
  });
}

/** Скачать blob в файл (fallback, когда TG share недоступен). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
