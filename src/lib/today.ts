export function getTodayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

// Monday of the ISO week containing `dateStr` (YYYY-MM-DD). Mon-start.
export function getWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const daysBack = (dow + 6) % 7; // Mon=0, Sun=6
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

// Sunday of the ISO week containing `dateStr` (YYYY-MM-DD). Mon-start weeks.
export function getWeekEnd(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const daysForward = (7 - dow) % 7; // Sun=0, Mon=6, ..., Sat=1
  d.setUTCDate(d.getUTCDate() + daysForward);
  return d.toISOString().slice(0, 10);
}

// The last n calendar dates ending at (and including) `today`, oldest first.
export function lastNDates(today: string, n: number): string[] {
  const base = new Date(`${today}T12:00:00Z`);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
