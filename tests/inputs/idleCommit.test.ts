import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMIT_IDLE_MS, createIdleCommitter } from '@/app/components/ui/idleCommit';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('NumberField idle commit (UX-06)', () => {
  it('typing "42000" commits once, after the pause, never the partial numbers', () => {
    const commit = vi.fn();
    const idle = createIdleCommitter<string>(commit);
    for (const text of ['4', '42', '420', '4200', '42000']) {
      idle.schedule(text);
      vi.advanceTimersByTime(120); // a fast typist
    }
    expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(COMMIT_IDLE_MS);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('42000');
  });

  it('Enter / blur commit immediately; Escape drops the pending value', () => {
    const commit = vi.fn();
    const idle = createIdleCommitter<string>(commit);
    idle.schedule('21');
    expect(idle.pending).toBe(true);
    expect(idle.flush()).toBe(true);
    expect(commit).toHaveBeenCalledWith('21');
    expect(idle.flush()).toBe(false);
    idle.schedule('2100');
    idle.cancel();
    vi.advanceTimersByTime(COMMIT_IDLE_MS * 2);
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
