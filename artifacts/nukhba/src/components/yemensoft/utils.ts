export function formatNum(n: number): string {
  return n.toLocaleString("ar-SA");
}

export function formatMoney(n: number): string {
  return `${n.toLocaleString("ar-SA")} ريال`;
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function nowStr(): string {
  return new Date().toISOString();
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
