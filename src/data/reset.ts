export interface ResetTimer {
  remainingMs: number;
  label: string;
}

export function getDailyReset(now: Date = new Date()): ResetTimer {
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  const remainingMs = midnight.getTime() - now.getTime();
  return { remainingMs, label: formatDuration(remainingMs) };
}

export function getWeeklyReset(
  anchorDay: number | null,
  now: Date = new Date()
): ResetTimer {
  let targetMs: number;

  if (anchorDay !== null) {
    const current = now.getDay();
    const daysUntil = (anchorDay - current + 7) % 7 || 7;
    const target = new Date(now);
    target.setDate(target.getDate() + daysUntil);
    target.setHours(0, 0, 0, 0);
    targetMs = target.getTime();
  } else {
    targetMs = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  }

  const remainingMs = targetMs - now.getTime();
  return { remainingMs, label: formatDuration(remainingMs) };
}

function formatDuration(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
