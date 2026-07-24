// Reviews are editable for LOCK_HOURS after the FIRST submit (i.e.
// `completed_at`), then permanently locked. This matches the intent of
// "reflect while it's still fresh, then let the record settle".
export const LOCK_HOURS = 12;

export function reviewLocksAt(completedAt: string | null): Date | null {
  if (!completedAt) return null;
  return new Date(new Date(completedAt).getTime() + LOCK_HOURS * 3600 * 1000);
}

export function isReviewLocked(completedAt: string | null, now: Date = new Date()): boolean {
  const lockAt = reviewLocksAt(completedAt);
  return lockAt !== null && now >= lockAt;
}

// "3h 42m" — for the UI banner. Returns null if already locked or never submitted.
export function timeUntilLock(completedAt: string | null, now: Date = new Date()): string | null {
  const lockAt = reviewLocksAt(completedAt);
  if (!lockAt) return null;
  const ms = lockAt.getTime() - now.getTime();
  if (ms <= 0) return null;
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
