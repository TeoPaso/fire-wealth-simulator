import { common } from './common';
import { inputs } from './inputs';
import { issues } from './issues';
import { results } from './results';

/** A message domain: one flat map per language, keys prefixed with `<domain>.`. */
export interface MessageDomain {
  it: Record<string, string>;
  en: Record<string, string>;
}

/** Every message domain, by name. The name is also the mandatory key prefix (`<name>.`). */
export const DOMAINS: Record<'common' | 'inputs' | 'issues' | 'results', MessageDomain> = {
  common,
  inputs,
  issues,
  results,
};
