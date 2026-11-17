#!/usr/bin/env node
/**
 * End-to-end smoke test of the production static export (docs/SPEC.md §9).
 *
 *   npm run build && npm run e2e
 *
 * Serves `out/` with a tiny node:http static server (nothing is downloaded), drives Chromium through the
 * preinstalled `playwright` package and checks:
 *  - the page loads with no console errors, failed requests or uncaught exceptions;
 *  - the headline shows an FI age, and Monte Carlo completes in the Web Worker;
 *  - the export menu item produces a JSON file with the plans;
 *  - the numbers shown equal the engine's own results for the example plan (FI age, years, FIRE number, net worth
 *    at retirement, Monte Carlo success, payroll card = computePayroll), and the real / nominal toggle shows
 *    real = nominal / price index (flows: start-of-year index; balances: end-of-year index);
 *  - editing the monthly expenses changes the headline (to the engine's value) and survives a reload;
 *  - the service worker becomes ready within 5 s; the app starts offline in a FRESH browser after a single online
 *    visit (cold start), also with a query string, and after reloads;
 *  - in English, the visible text of the main panels contains no common Italian UI words and no raw i18n keys;
 *  - no horizontal overflow at 375 px and 1440 px (both languages, every results tab, both mobile panels).
 *
 * The engine and the i18n dictionaries are imported straight from the TypeScript sources through Node's type
 * stripping (Node >= 22.18), so expected values and labels never drift from the app.
 *
 * Options: E2E_SHOTS=<dir> saves screenshots there; E2E_OUT=<dir> serves another build directory.
 * Exit code: 0 when every check passes, 1 otherwise.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire, registerHooks } from 'node:module';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = resolve(ROOT, process.env.E2E_OUT ?? 'out');
const SHOTS_DIR = process.env.E2E_SHOTS ? resolve(process.env.E2E_SHOTS) : null;
const STORAGE_KEY = 'fire-planner:v2';
const EDITED_MONTHLY = 2100;

/* ───────────────────────────── Engine + i18n from the TypeScript sources ───────────────────────────── */

async function loadSources() {
  if (!process.features?.typescript || typeof registerHooks !== 'function') {
    throw new Error(`Node ${process.versions.node} cannot load the TypeScript sources: the e2e smoke test needs Node >= 22.18.`);
  }
  const rootUrl = pathToFileURL(ROOT + sep).href;
  const isFile = (p) => existsSync(p) && statSync(p).isFile();
  // Resolve '@/…' and extensionless relative imports of the TS sources, as the bundler does.
  registerHooks({
    resolve(specifier, context, nextResolve) {
      const parent = context.parentURL ?? '';
      let target = null;
      if (specifier.startsWith('file:') && specifier.endsWith('.ts')) target = new URL(specifier);
      else if (parent.startsWith(rootUrl) && parent.endsWith('.ts')) {
        if (specifier.startsWith('@/')) target = new URL(specifier.slice(2), rootUrl);
        else if (specifier.startsWith('./') || specifier.startsWith('../')) target = new URL(specifier, parent);
      }
      if (target) {
        const base = fileURLToPath(target);
        for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
          if (candidate.endsWith('.ts') && isFile(candidate)) {
            return { url: pathToFileURL(candidate).href, format: 'module-typescript', shortCircuit: true };
          }
        }
      }
      return nextResolve(specifier, context);
    },
  });
  const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);
  const [engine, core, format] = await Promise.all([load('lib/engine/index.ts'), load('lib/i18n/core.ts'), load('lib/i18n/format.ts')]);
  return { engine, core, format };
}

/* ───────────────────────────── Static server ───────────────────────────── */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function startServer(dir) {
  const fileFor = (pathname) => {
    const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
    const abs = resolve(dir, rel);
    if (abs !== dir && !abs.startsWith(dir + sep)) return null; // path traversal
    const candidates = [abs, join(abs, 'index.html'), `${abs}.html`];
    return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
  };
  const server = createServer((req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = fileFor(pathname);
    const status = file ? 200 : 404;
    const body = file ? readFileSync(file) : existsSync(join(dir, '404.html')) ? readFileSync(join(dir, '404.html')) : 'Not found';
    res.writeHead(status, {
      'Content-Type': file ? (MIME[extname(file)] ?? 'application/octet-stream') : 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => resolveServer(server));
  });
}

/* ───────────────────────────── Tiny test harness ───────────────────────────── */

const results = [];

class CheckError extends Error {}

function expect(condition, message) {
  if (!condition) throw new CheckError(message);
}

function expectEqual(actual, expected, what) {
  if (actual !== expected) throw new CheckError(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function step(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''} (${Date.now() - started} ms)`);
    return true;
  } catch (error) {
    results.push({ name, ok: false });
    console.log(`  FAIL  ${name}\n        ${error instanceof CheckError ? error.message : (error?.stack ?? String(error))}`);
    return false;
  }
}

/** Whitespace-insensitive text (Intl uses NBSP / NNBSP around € and in groups). */
const norm = (s) => String(s ?? '').replace(/[\s  ]+/g, ' ').trim();

/* ───────────────────────────── Page helpers ───────────────────────────── */

async function text(locator) {
  return norm(await locator.first().innerText());
}

async function waitForResults(page) {
  await page.locator('[data-testid="fi-age"]').first().waitFor({ state: 'visible', timeout: 30_000 });
}

async function waitForAnalysis(page) {
  await page.locator('[data-testid="analysis-status"][data-state="done"]').first().waitFor({ state: 'attached', timeout: 30_000 });
}

async function horizontalOverflow(page) {
  return page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
}

async function expectNoOverflow(page, where) {
  const { scrollWidth, innerWidth } = await horizontalOverflow(page);
  expect(scrollWidth <= innerWidth, `${where}: horizontal overflow (scrollWidth ${scrollWidth} > innerWidth ${innerWidth})`);
}

async function shot(page, name) {
  if (!SHOTS_DIR) return;
  await mkdir(SHOTS_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOTS_DIR, `${name}.png`), fullPage: false });
}

async function openSection(page, id) {
  const button = page.locator(`#inputs-section-${id}-button`);
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
}

/** Opens (or closes) every input section, whatever their current state. */
async function setAllSections(page, tr, lang, open) {
  const button = page.getByRole('button', { name: tr(lang, open ? 'inputs.panel.expandAll' : 'inputs.panel.collapseAll'), exact: true });
  if (await button.isVisible()) await button.click();
  await page
    .getByRole('button', { name: tr(lang, open ? 'inputs.panel.collapseAll' : 'inputs.panel.expandAll'), exact: true })
    .waitFor({ state: 'visible' });
}

async function clickTab(page, label) {
  const tab = page.getByRole('tab', { name: label, exact: true });
  await tab.click();
  await page.waitForFunction((el) => el?.getAttribute('aria-selected') === 'true', await tab.elementHandle());
}

async function setRadio(page, name) {
  await page.getByRole('radio', { name, exact: true }).click();
  await page.waitForFunction(
    (n) => [...document.querySelectorAll('[role="radio"]')].some((r) => (r.getAttribute('aria-label') ?? r.textContent?.trim()) === n && r.getAttribute('aria-checked') === 'true'),
    name,
  );
}

/** Strings typed by the user (plan names, labels, notes…): they stay as entered whatever the UI language. */
function userStrings(plans) {
  const out = new Set();
  for (const p of plans) {
    out.add(p.name);
    out.add(p.notes);
    out.add(p.pensionFund?.name);
    for (const c of p.career ?? []) out.add(c.label);
    for (const e of p.spending?.events ?? []) out.add(e.label);
    for (const a of p.portfolio?.assets ?? []) out.add(a.name);
    out.add(p.taxRules?.label);
    for (const s of p.taxRules?.sources ?? []) out.add(s.label);
  }
  return [...out].filter((s) => typeof s === 'string' && s.trim().length > 0).sort((a, b) => b.length - a.length);
}

/**
 * Common Italian UI words that must not survive the switch to English (whole words, case-insensitive). Italian
 * legal terms kept on purpose in the English texts (IRPEF, INPS, TFR, RITA, riscatto, addizionale…) are not here.
 */
const ITALIAN_WORDS = [
  'anni', 'anno', 'età', 'oggi', 'spese', 'mensili', 'risultati', 'dati', 'profilo', 'carriera', 'lavoro',
  'patrimonio', 'investimenti', 'mercato', 'regole', 'fiscali', 'panoramica', 'flussi', 'sensibilità', 'confronto',
  'ipotesi', 'fonti', 'esporta', 'importa', 'ripristina', 'mostra', 'nascondi', 'calcolo', 'corso', 'netto', 'lordo',
  'stipendio', 'probabilità', 'successo', 'tasso', 'risparmio', 'spesa', 'aggiungi', 'rimuovi', 'elimina',
  'annulla', 'conferma', 'chiudi', 'salva', 'della', 'delle', 'degli', 'dello', 'nel', 'nella', 'dal', 'alla',
  'sono', 'puoi', 'smettere', 'lavorare', 'pensione', 'fondo', 'prelievi', 'ritiro', 'entrate', 'uscite', 'tasse',
  'imposte', 'valori', 'nominale', 'piano', 'esempio', 'sezioni', 'apri', 'tutte', 'anche', 'oppure', 'quando',
  'mese', 'mesi', 'euro di oggi', 'contributi', 'versamenti', 'liquidità', 'azioni', 'obbligazioni', 'rendimento',
  'inflazione', 'aliquota', 'detrazione', 'reddito', 'ancora', 'questo', 'questa', 'senza', 'circa',
];
const ITALIAN_RE = new RegExp(`(?<![\\p{L}])(${ITALIAN_WORDS.join('|')})(?![\\p{L}])`, 'giu');
const RAW_KEY_RE = /\b(?:common|inputs|results|issues)\.[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+\b/g;

/* ───────────────────────────── Main ───────────────────────────── */

async function main() {
  if (!existsSync(join(OUT_DIR, 'index.html'))) {
    console.error(`No static export in ${OUT_DIR}: run "npm run build" first.`);
    return 1;
  }

  const { engine, core, format } = await loadSources();
  const tr = (lang, key, params) => core.translate(lang, key, params);
  const trp = (lang, key, count, params) => core.translatePlural(lang, key, count, params);
  const fmt = { it: format.createFormatters('it'), en: format.createFormatters('en') };

  let chromium;
  try {
    ({ chromium } = createRequire(import.meta.url)('playwright'));
  } catch {
    console.error('The "playwright" package is not resolvable from this project (it is expected to be preinstalled).');
    return 1;
  }

  // The post-build step of `npm run build` (precache manifest in sw.js); idempotent, so also fine after it ran.
  try {
    const { injectIntoBuild } = await import('./sw-precache.mjs');
    const { version, count } = injectIntoBuild(OUT_DIR);
    console.log(`Service worker precache: ${count} files, version ${version}`);
  } catch (error) {
    console.error(`Could not inject the service-worker precache manifest: ${error?.message ?? error}`);
    return 1;
  }

  const server = await startServer(OUT_DIR);
  const base = `http://127.0.0.1:${server.address().port}/`;
  console.log(`Serving ${OUT_DIR} at ${base}`);

  const browser = await chromium.launch();
  const problems = [];
  // While offline on purpose, failed network requests are expected (the service worker answers from its cache).
  let offline = false;
  const watch = (page, label) => {
    const report = (message) => {
      if (offline) offlineNotes.push(`[${label}] ${message}`);
      else problems.push(`[${label}] ${message}`);
    };
    const offlineNotes = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') report(`console.error: ${msg.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`[${label}] uncaught: ${error.message}`));
    page.on('requestfailed', (request) => {
      if (request.url().startsWith(base)) report(`request failed: ${request.url()} (${request.failure()?.errorText})`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) report(`HTTP ${response.status()}: ${response.url()}`);
    });
    return offlineNotes;
  };

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
    const page = await context.newPage();
    const offlineNotes = watch(page, 'desktop');

    // Expected values: the active plan of a fresh install is the example plan built by createDefaultPlan().
    let exported = null;
    let plan = null;
    let expected = null;
    const workers = [];
    page.on('worker', (w) => workers.push(w.url()));

    console.log('Desktop 1440×900, Italian');
    const loaded = await step('page loads with the results and no console errors', async () => {
      await page.goto(base, { waitUntil: 'load' });
      await waitForResults(page);
      await waitForAnalysis(page);
      expectEqual(await page.evaluate(() => document.documentElement.lang), 'it', '<html lang>');
      expect(problems.length === 0, `problems while loading:\n        ${problems.join('\n        ')}`);
      await shot(page, 'e2e-desktop-it');
    });
    if (!loaded) return finish(browser, server, problems);

    await step('headline shows an FI age', async () => {
      const fi = await text(page.locator('[data-testid="fi-age"]'));
      expect(/\d/.test(fi), `headline has no age: "${fi}"`);
      return fi;
    });

    await step('Monte Carlo + sensitivity ran in the Web Worker', async () => {
      const engineUsed = await page.locator('[data-testid="analysis-status"]').getAttribute('data-engine');
      expectEqual(engineUsed, 'worker', 'analysis engine');
      expect(workers.length > 0, 'no worker was started');
    });

    await step('export menu item produces the plans as JSON', async () => {
      await page.getByRole('button', { name: tr('it', 'common.menu.open'), exact: true }).click();
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10_000 }),
        page.getByRole('menuitem', { name: tr('it', 'common.menu.export') }).click(),
      ]);
      expect(download.suggestedFilename().endsWith('.json'), `file name ${download.suggestedFilename()}`);
      exported = JSON.parse(await readFile(await download.path(), 'utf8'));
      expectEqual(exported.version, 2, 'export version');
      expect(Array.isArray(exported.plans) && exported.plans.length > 0, 'export has no plans');
      const stored = JSON.parse((await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)) ?? 'null');
      const activeId = stored?.activePlanId ?? exported.plans[0].id;
      plan = exported.plans.find((p) => p.id === activeId) ?? exported.plans[0];
      return `${download.suggestedFilename()}, ${exported.plans.length} plans`;
    });

    await step('active plan is the example plan (createDefaultPlan)', async () => {
      expect(plan, 'no exported plan');
      const def = engine.createDefaultPlan({ id: plan.id, name: plan.name, startYear: plan.profile.startYear, now: plan.createdAt });
      expect(isDeepStrictEqual(plan, def), 'the exported active plan differs from createDefaultPlan()');
      const result = engine.runPlan(def);
      const mc = engine.runMonteCarlo(def);
      expected = { plan: def, result, mc };
      const s = result.summary;
      return `fiAge ${s.fiAge}, confident ${mc.confidentFiAge}, success ${mc.successProbabilityPct.toFixed(1)}%`;
    });

    if (expected) {
      const { result, mc } = expected;
      const s = result.summary;
      const R = s.retirementAge;
      const rowAt = (age) => result.rows.find((r) => r.age === age);

      await step('headline numbers equal runPlan / runMonteCarlo', async () => {
        const f = fmt.it;
        expect(s.fiAge !== null, 'example plan has no FI age');
        expectEqual(await text(page.locator('[data-testid="fi-age"]')), norm(tr('it', 'results.ageValue', { age: f.num(s.fiAge) })), 'FI age');
        const headline = await text(page.locator('#results-headline').locator('xpath=..'));
        const when = norm(trp('it', 'results.headline.inYears', s.yearsToFi, { year: String(plan.profile.startYear + s.yearsToFi) }));
        expect(headline.includes(when), `headline lacks "${when}"`);
        expect(headline.includes(norm(f.eur(s.fireNumberToday))), `headline lacks the FIRE number ${f.eur(s.fireNumberToday)}`);
        expect(headline.includes(norm(f.pct(mc.successProbabilityPct, 0))), `headline lacks the MC success ${f.pct(mc.successProbabilityPct, 0)}`);
        const confident = mc.confidentFiAge === null ? null : norm(tr('it', 'results.ageValue', { age: f.num(mc.confidentFiAge) }));
        expect(confident === null || headline.includes(confident), `headline lacks the confident FI age ${confident}`);
        const overview = await text(page.locator('#panel-results'));
        expect(overview.includes(norm(f.eur(s.netWorthAtRetirementToday))), `overview lacks the net worth at retirement ${f.eur(s.netWorthAtRetirementToday)}`);
        return `FI ${s.fiAge}, FIRE number ${f.eur(s.fireNumberToday)}, net worth at ${R} ${f.eur(s.netWorthAtRetirementToday)}`;
      });

      await step('payroll card equals computePayroll (year 0)', async () => {
        await clickTab(page, tr('it', 'results.tab.flows'));
        const card = page.locator('section[aria-labelledby="results-payroll"]');
        await card.waitFor();
        const row = result.rows[0];
        const phase = plan.career.find((p) => p.untilAge > row.age) ?? plan.career[plan.career.length - 1];
        expectEqual(phase.bonusRegime, 'productivity', 'example bonus regime');
        const independent = engine.computePayroll(
          {
            ral: row.ral,
            ordinaryBonus: 0,
            productivityBonus: row.bonusGross,
            priorYearIncome: row.ral, // below the 80k eligibility limit, as the engine's own estimate
            employeePensionContribution: row.pfEmployee,
            employerPensionContribution: row.pfEmployer,
            calendarYear: row.calendarYear,
            priceIndex: row.priceIndex,
          },
          plan.taxRules,
        );
        for (const key of ['gross', 'inps', 'irpefNet', 'regionalSurcharge', 'municipalSurcharge', 'productivityBonusTax', 'netIncome', 'pensionTaxSaving']) {
          expect(Math.abs(independent[key] - row.payroll[key]) < 0.005, `rows[0].payroll.${key} ${row.payroll[key]} ≠ computePayroll ${independent[key]}`);
        }
        const f = fmt.it;
        expectEqual(await text(card.locator('[data-testid="payroll-net"]')), norm(f.eur(independent.netIncome)), 'net annual pay');
        const lines = {
          gross: independent.gross,
          inps: independent.inps,
          irpefNet: independent.irpefNet,
          regionalSurcharge: independent.regionalSurcharge,
          municipalSurcharge: independent.municipalSurcharge,
          productivityBonusTax: independent.productivityBonusTax,
          taxableIncome: independent.taxableIncome,
          irpefGross: independent.irpefGross,
          pensionTaxSaving: independent.pensionTaxSaving,
        };
        for (const [key, value] of Object.entries(lines)) {
          const cells = card.locator(`tr[data-line="${key}"] td`);
          const n = await cells.count();
          expect(n > 0, `payroll line ${key} missing`);
          for (let i = 0; i < n; i++) expectEqual(norm(await cells.nth(i).innerText()), norm(f.eur(value)), `payroll line ${key}`);
        }
        return `net ${f.eur(independent.netIncome)}`;
      });

      await step('real / nominal toggle: real = nominal / price index', async () => {
        const f = fmt.it;
        const card = page.locator('section[aria-labelledby="results-payroll"]');
        const age = Math.min(R - 1, plan.profile.currentAge + 12);
        const row = rowAt(age);
        expect(row && row.payroll && row.priceIndex > 1.05, `no working row with inflation at age ${age}`);
        await card.locator('select').selectOption(String(age));
        const net = card.locator('[data-testid="payroll-net"]');
        expectEqual(await text(net), norm(f.eur(row.payroll.netIncome / row.priceIndex)), `real net pay at ${age}`);
        await setRadio(page, tr('it', 'common.valueMode.nominal'));
        expectEqual(await text(net), norm(f.eur(row.payroll.netIncome)), `nominal net pay at ${age}`);

        await clickTab(page, tr('it', 'results.tab.table'));
        const cell = (a, col) => page.locator(`tr[data-age="${a}"] td[data-col="${col}"]`);
        const late = rowAt(R + 5);
        expectEqual(await text(cell(late.age, 'netWorth')), norm(f.eur(late.netWorth)), `nominal net worth at ${late.age}`);
        expectEqual(await text(cell(row.age, 'netPay')), norm(f.eur(row.payroll.netIncome + (row.welfareBenefit ?? 0))), `nominal net pay cell at ${age}`);
        await setRadio(page, tr('it', 'common.valueMode.real'));
        expectEqual(await text(cell(late.age, 'netWorth')), norm(f.eur(late.netWorth / late.priceIndexEnd)), `real net worth at ${late.age}`);
        expectEqual(await text(cell(row.age, 'netPay')), norm(f.eur((row.payroll.netIncome + (row.welfareBenefit ?? 0)) / row.priceIndex)), `real net pay cell at ${age}`);
        const last = rowAt(R - 1);
        expectEqual(await text(cell(last.age, 'netWorth')), norm(f.eur(s.netWorthAtRetirementToday)), 'table net worth at retirement = summary');
        await clickTab(page, tr('it', 'results.tab.overview'));
        return `price index at ${age}: ${row.priceIndex.toFixed(4)}`;
      });

      await step('no horizontal overflow at 1440 px (every results tab, all sections open)', async () => {
        await setAllSections(page, tr, 'it', true);
        for (const key of ['overview', 'flows', 'table', 'sensitivity', 'compare', 'assumptions']) {
          await clickTab(page, tr('it', `results.tab.${key}`));
          await expectNoOverflow(page, `1440 px, tab ${key}`);
        }
        await clickTab(page, tr('it', 'results.tab.overview'));
        await setAllSections(page, tr, 'it', false);
      });

      let editedFi = null;
      await step('editing monthly expenses changes the headline', async () => {
        const before = await text(page.locator('[data-testid="fi-age"]'));
        await openSection(page, 'spending');
        // Like a keyboard user: Tab into the field (which selects its text), type the new amount, Tab out.
        await page.locator('#inputs-section-spending-button').focus();
        for (let i = 0; i < 10 && (await page.evaluate(() => document.activeElement?.id)) !== 'in-spending-monthlyToday'; i++) {
          await page.keyboard.press('Tab');
        }
        expectEqual(await page.evaluate(() => document.activeElement?.id), 'in-spending-monthlyToday', 'focused field');
        await page.keyboard.type(String(EDITED_MONTHLY));
        await page.keyboard.press('Tab');
        const edited = { ...expected.plan, spending: { ...expected.plan.spending, monthlyToday: EDITED_MONTHLY } };
        const after = engine.runPlan(edited).summary;
        expect(after.fiAge !== null && after.fiAge !== s.fiAge, `test setup: ${EDITED_MONTHLY} €/month should move the FI age`);
        editedFi = norm(tr('it', 'results.ageValue', { age: fmt.it.num(after.fiAge) }));
        await page.waitForFunction(
          (want) => document.querySelector('[data-testid="fi-age"]')?.textContent?.replace(/[\s  ]+/g, ' ').trim() === want,
          editedFi,
          { timeout: 10_000 },
        );
        await waitForAnalysis(page);
        return `${before} → ${editedFi} (engine: ${after.fiAge})`;
      });

      await step('reload keeps the edit (localStorage)', async () => {
        expect(editedFi, 'edit step failed');
        await page.waitForTimeout(600); // writes are debounced (250 ms)
        await page.reload({ waitUntil: 'load' });
        await waitForResults(page);
        expectEqual(await text(page.locator('[data-testid="fi-age"]')), editedFi, 'FI age after reload');
        await openSection(page, 'spending');
        const value = await page.locator('#in-spending-monthlyToday').inputValue();
        expectEqual(Number(value.replace(/\D/g, '')), EDITED_MONTHLY, 'monthly expenses after reload');
        const stored = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY));
        const active = stored.plans.find((p) => p.id === stored.activePlanId);
        expectEqual(active.spending.monthlyToday, EDITED_MONTHLY, 'stored monthly expenses');
      });
    }

    await step('service worker registers (ready within 5 s)', async () => {
      const state = await page.evaluate(
        () =>
          new Promise((done) => {
            if (!('serviceWorker' in navigator)) return done('unsupported');
            const timer = setTimeout(() => done('timeout'), 5000);
            navigator.serviceWorker.ready.then((reg) => {
              clearTimeout(timer);
              done(reg.active ? `active:${new URL(reg.active.scriptURL).pathname}` : 'no active worker');
            });
          }),
      );
      expectEqual(state, 'active:/sw.js', 'service worker');
    });

    await step('works offline after reloading (service worker cache), analysis still in the Web Worker', async () => {
      offline = true;
      await context.setOffline(true);
      try {
        await page.reload({ waitUntil: 'load' });
        await waitForResults(page);
        await waitForAnalysis(page);
        // The worker script now comes from the service worker's cache: it must still start (Turbopack's bootstrap
        // reads its config from the "#params=" fragment of the worker URL), not fall back to the main thread.
        const engineUsed = await page.locator('[data-testid="analysis-status"]').getAttribute('data-engine');
        expectEqual(engineUsed, 'worker', 'analysis engine offline');
      } finally {
        await context.setOffline(false);
        offline = false;
      }
      await page.reload({ waitUntil: 'load' });
      await waitForResults(page);
    });

    await step('cold start offline after ONE online visit in a fresh browser (also with a query string)', async () => {
      const fresh = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      try {
        const cold = await fresh.newPage();
        const coldNotes = watch(cold, 'cold-offline');
        await cold.goto(base, { waitUntil: 'load' });
        await waitForResults(cold);
        // Installed (precache done) and controlling the page; give the page time to report what it loaded.
        await cold.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 10_000 });
        await cold.waitForTimeout(1500);
        offline = true;
        await fresh.setOffline(true);
        await cold.reload({ waitUntil: 'load' });
        await waitForResults(cold);
        await cold.goto(`${base}?utm_source=e2e`, { waitUntil: 'load' });
        await waitForResults(cold);
        return `${coldNotes.length} expected offline note(s)`;
      } finally {
        await fresh.setOffline(false);
        offline = false;
        await fresh.close();
      }
    });

    console.log('Desktop 1440×900, English');
    const plansForText = exported?.plans ?? [];
    const englishCheck = async (where, scopes) => {
      const data = userStrings(plansForText);
      const hits = [];
      for (const scope of scopes) {
        let content = norm(await page.locator(scope).first().innerText());
        for (const s of data) content = content.split(norm(s)).join(' ');
        // Italian names quoted on purpose in the English texts (“La mia pensione futura”, “fondo TFR”…).
        content = content.replace(/“[^”]*”/g, ' ');
        for (const m of content.matchAll(ITALIAN_RE)) {
          hits.push(`"${m[0]}" in …${content.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40)}…`);
        }
        for (const m of content.matchAll(RAW_KEY_RE)) hits.push(`raw i18n key ${m[0]}`);
      }
      expect(hits.length === 0, `${where}: ${hits.length} Italian word(s) / raw keys:\n        ${[...new Set(hits)].slice(0, 15).join('\n        ')}`);
    };

    await step('switching to EN leaves no Italian UI words in the main panels', async () => {
      await setRadio(page, tr('it', 'common.lang.enName'));
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      await waitForResults(page);
      await englishCheck('header + panels (default view)', ['header', '#panel-inputs', '#panel-results', 'footer']);
      await setAllSections(page, tr, 'en', true);
      await englishCheck('inputs, all sections open', ['#panel-inputs']);
      for (const key of ['overview', 'flows', 'table', 'sensitivity', 'compare', 'assumptions']) {
        await clickTab(page, tr('en', `results.tab.${key}`));
        await englishCheck(`results tab ${key}`, ['#panel-results']);
        await expectNoOverflow(page, `1440 px EN, tab ${key}`);
      }
      await clickTab(page, tr('en', 'results.tab.overview'));
      await setAllSections(page, tr, 'en', false);
      await shot(page, 'e2e-desktop-en');
    });

    console.log('Mobile 375×812');
    await step('no horizontal overflow at 375 px (both panels, both languages, every tab)', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      for (const lang of ['en', 'it']) {
        if (lang === 'it') {
          await setRadio(page, tr('en', 'common.lang.itName'));
          await page.waitForFunction(() => document.documentElement.lang === 'it');
        }
        await page.getByRole('button', { name: tr(lang, 'common.nav.inputs'), exact: true }).click();
        await expectNoOverflow(page, `375 px ${lang}, inputs`);
        await setAllSections(page, tr, lang, true);
        await expectNoOverflow(page, `375 px ${lang}, inputs with all sections open`);
        await setAllSections(page, tr, lang, false);
        await shot(page, `e2e-mobile-inputs-${lang}`);
        await page.getByRole('button', { name: tr(lang, 'common.nav.results'), exact: true }).click();
        await waitForResults(page);
        for (const key of ['overview', 'flows', 'table', 'sensitivity', 'compare', 'assumptions']) {
          await clickTab(page, tr(lang, `results.tab.${key}`));
          await expectNoOverflow(page, `375 px ${lang}, tab ${key}`);
        }
        await clickTab(page, tr(lang, 'results.tab.overview'));
        await shot(page, `e2e-mobile-results-${lang}`);
      }
    });

    if (offlineNotes.length > 0) console.log(`  note  while offline (expected): ${offlineNotes.length} failed request(s) / console error(s)`);
    await step('no console errors, failed requests or uncaught exceptions during the whole run', async () => {
      expect(problems.length === 0, `${problems.length} problem(s):\n        ${problems.join('\n        ')}`);
    });

    await context.close();
  } catch (error) {
    results.push({ name: 'unexpected error', ok: false });
    console.log(`  FAIL  unexpected error\n        ${error?.stack ?? error}`);
  }
  return finish(browser, server, problems);
}

async function finish(browser, server) {
  await browser.close().catch(() => {});
  await new Promise((done) => server.close(() => done()));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed${failed.length ? `; failed: ${failed.map((r) => r.name).join('; ')}` : ''}`);
  return failed.length === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error?.stack ?? error);
    process.exit(1);
  },
);
