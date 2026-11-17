import type { StorageLike } from '../persistence';

/**
 * In-memory Web Storage for tests. `failWrites` simulates a full quota / private mode; `failWritesFor` makes only
 * the matching keys fail (e.g. backups); `quota` caps the total characters stored (keys + values).
 */
export class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  failWrites = false;
  failWritesFor: ((key: string) => boolean) | null = null;
  quota = Infinity;
  writes = 0;

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    const used = [...this.data].reduce((n, [k, v]) => (k === key ? n : n + k.length + v.length), 0);
    if (this.failWrites || this.failWritesFor?.(key) || used + key.length + String(value).length > this.quota) {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.writes++;
    this.data.set(key, String(value));
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  keys(): string[] {
    return [...this.data.keys()];
  }
}
