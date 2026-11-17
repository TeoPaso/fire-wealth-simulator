#!/usr/bin/env node
/**
 * Post-build step (runs after `npm run build`; scripts/e2e-smoke.mjs runs it too): injects the precache manifest
 * into out/sw.js — every file under out/_next/static plus the manifest and the icons — with a version derived from
 * the content of the build (so every deploy gets a fresh cache and old chunks are deleted, without bumping a
 * constant by hand). Idempotent: running it again on the same build rewrites the same manifest.
 *
 *   node scripts/sw-precache.mjs [outDir]
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = /\/\* @precache-manifest \*\/ [^;\n]*;/;

/** Files to precache, relative to the scope (forward slashes), sorted. */
export function precacheFiles(outDir) {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(relative(outDir, full).split(sep).join('/'));
    }
  };
  const staticDir = join(outDir, '_next', 'static');
  if (existsSync(staticDir)) walk(staticDir);
  for (const extra of ['manifest.json', 'icons']) {
    const full = join(outDir, extra);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) walk(full);
    else files.push(extra);
  }
  return [...new Set(files)].sort();
}

/** Content hash of the build: the precached files plus the HTML shell. */
export function buildVersion(outDir, files) {
  const hash = createHash('sha256');
  for (const file of [...files, 'index.html']) {
    const full = join(outDir, file);
    if (!existsSync(full)) continue;
    hash.update(file);
    hash.update('\0');
    hash.update(readFileSync(full));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

/** Returns the service-worker source with the manifest injected (throws if the marker is missing). */
export function injectManifest(source, manifest) {
  if (!MARKER.test(source)) throw new Error('sw.js has no "/* @precache-manifest */ …;" marker');
  return source.replace(MARKER, () => `/* @precache-manifest */ ${JSON.stringify(manifest)};`);
}

export function injectIntoBuild(outDir) {
  const swPath = join(outDir, 'sw.js');
  if (!existsSync(swPath)) throw new Error(`${swPath} not found: run "npm run build" first`);
  const urls = precacheFiles(outDir);
  const version = buildVersion(outDir, urls);
  writeFileSync(swPath, injectManifest(readFileSync(swPath, 'utf8'), { version, urls }));
  return { version, count: urls.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outDir = resolve(process.argv[2] ?? 'out');
  try {
    const { version, count } = injectIntoBuild(outDir);
    console.log(`sw-precache: ${count} files, cache version ${version} → ${join(outDir, 'sw.js')}`);
  } catch (error) {
    console.error(`sw-precache: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
