/**
 * Commits a value after the user stops typing for `delayMs` (or immediately on flush). Used by NumberField so that
 * typing "42000" does not commit 4, 42, 420 and 4200 on the way: each commit recomputes the whole plan, flips the
 * results and is saved. Pure (no React, no DOM) so it can be unit tested with fake timers.
 */
export const COMMIT_IDLE_MS = 450;

export interface IdleCommitter<T> {
  /** Remembers `value` and (re)starts the idle timer. */
  schedule(value: T): void;
  /** Commits the scheduled value now, if any. Returns true when something was committed. */
  flush(): boolean;
  /** Drops the scheduled value. */
  cancel(): void;
  readonly pending: boolean;
}

export function createIdleCommitter<T>(commit: (value: T) => void, delayMs = COMMIT_IDLE_MS): IdleCommitter<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let scheduled: { value: T } | null = null;
  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const flush = () => {
    clear();
    if (!scheduled) return false;
    const { value } = scheduled;
    scheduled = null;
    commit(value);
    return true;
  };
  return {
    schedule(value) {
      scheduled = { value };
      clear();
      timer = setTimeout(flush, delayMs);
    },
    flush,
    cancel() {
      clear();
      scheduled = null;
    },
    get pending() {
      return scheduled !== null;
    },
  };
}
