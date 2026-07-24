// Runnable check: `npx tsx src/lib/review-lock.check.ts`.
import assert from "node:assert";
import { isReviewLocked, timeUntilLock, LOCK_HOURS } from "./review-lock";

const now = new Date("2026-07-25T12:00:00Z");

// Never submitted → not locked, no countdown.
assert.strictEqual(isReviewLocked(null, now), false);
assert.strictEqual(timeUntilLock(null, now), null);

// Just submitted (0h ago) → not locked, full window remaining.
const justNow = "2026-07-25T12:00:00Z";
assert.strictEqual(isReviewLocked(justNow, now), false);
assert.strictEqual(timeUntilLock(justNow, now), `${LOCK_HOURS}h 0m`);

// Submitted 3h30m ago → not locked, 8h30m left.
const threeHalfAgo = "2026-07-25T08:30:00Z";
assert.strictEqual(isReviewLocked(threeHalfAgo, now), false);
assert.strictEqual(timeUntilLock(threeHalfAgo, now), "8h 30m");

// Submitted 12h ago exactly → locked.
const twelveAgo = "2026-07-25T00:00:00Z";
assert.strictEqual(isReviewLocked(twelveAgo, now), true);
assert.strictEqual(timeUntilLock(twelveAgo, now), null);

// Submitted 20h ago → locked.
const twentyAgo = "2026-07-24T16:00:00Z";
assert.strictEqual(isReviewLocked(twentyAgo, now), true);

// Submitted 11h55m ago → not locked, 5m left.
const almostLocked = "2026-07-25T00:05:00Z";
assert.strictEqual(isReviewLocked(almostLocked, now), false);
assert.strictEqual(timeUntilLock(almostLocked, now), "5m");

console.log("review-lock.check.ts OK");
