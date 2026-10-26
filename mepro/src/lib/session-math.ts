/**
 * Session time.
 *
 * The API requires a duration when a session is completed, and clamps it to
 * 1..300 minutes. Deriving it from the start time means the value is always
 * valid, so the screen never has to guard against sending zero (rejected) or a
 * runaway timer (rejected at 300).
 */

/** The API's accepted range for `durationMinutes` on completion. */
export const MIN_SESSION_MINUTES = 1;
export const MAX_SESSION_MINUTES = 300;

/**
 * Whole minutes between `startedAt` and `now`, clamped to the accepted range.
 *
 * A missing or unparseable start time yields the minimum rather than zero,
 * because the server rejects zero and a user who just tapped start has still
 * trained. Negative differences (a clock change mid-session) collapse to the
 * minimum too.
 */
export function elapsedSessionMinutes(startedAt: string | null | undefined, now: Date = new Date()): number {
  if (!startedAt) return MIN_SESSION_MINUTES;

  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return MIN_SESSION_MINUTES;

  const elapsedMs = now.getTime() - started;
  // Round up so a 30-second session records as 1 minute, not 0.
  const minutes = Math.ceil(elapsedMs / 60_000);

  if (!Number.isFinite(minutes)) return MIN_SESSION_MINUTES;
  return Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, minutes));
}
