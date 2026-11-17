import type { StorageLike } from '../persistence';

/** In-memory Web Storage for tests. `failWrites` simulates a full quota / private mode. */
export class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  failWrites = false;
  writes = 0;

  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
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
