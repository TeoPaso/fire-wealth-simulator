import type { Plan } from './types';

export interface MigrateOptions {
  startYear?: number;
  now?: string;
}

// STUB — to be implemented (docs/SPEC.md §6). Best effort, never throws: returns [] if nothing usable.
export function migrateV1State(_raw: unknown, _opts: MigrateOptions = {}): Plan[] {
  return [];
}
