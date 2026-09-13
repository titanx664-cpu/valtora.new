// Shared formatting utilities

export function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(ts: number | string): string {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(ts: number | string): string {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return d.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getNextSunday(): string {
  const now = new Date();
  // Convert to Karachi time (UTC+5)
  const karachi = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const day = karachi.getUTCDay();
  if (day === 0) return "Today (Sunday)";
  const daysUntil = 7 - day;
  const next = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
  return next.toLocaleDateString("en-PK", { weekday: "long", day: "2-digit", month: "long" });
}

export function isSundayKarachi(): boolean {
  const now = new Date();
  const karachi = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return karachi.getUTCDay() === 0;
}

/** Returns seconds remaining until next Sunday midnight (Karachi UTC+5) */
export function getSecondsUntilNextSunday(): number {
  const now = new Date();
  const karachi = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const day = karachi.getUTCDay(); // 0=Sun
  if (day === 0) return 0; // it's Sunday
  const daysUntil = 7 - day;
  const nextSundayMidnight = new Date(karachi);
  nextSundayMidnight.setUTCDate(nextSundayMidnight.getUTCDate() + daysUntil);
  nextSundayMidnight.setUTCHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((nextSundayMidnight.getTime() - karachi.getTime()) / 1000));
}

export function formatCountdown(seconds: number): { days: number; hours: number; minutes: number; secs: number } {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return { days, hours, minutes, secs };
}

export const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-400/10",
  approved: "text-emerald-400 bg-emerald-400/10",
  rejected: "text-red-400 bg-red-400/10",
  processing: "text-blue-400 bg-blue-400/10",
  completed: "text-emerald-400 bg-emerald-400/10",
  credited: "text-emerald-400 bg-emerald-400/10",
  reversed: "text-red-400 bg-red-400/10",
};
