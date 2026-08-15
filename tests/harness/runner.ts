/**
 * E2E Test Suite Runner for FIRE PWA Project
 * Discovers and executes test files in `tests/`, reports summary stats
 * (total, passed, failed, execution time, tier breakdowns).
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { TestCase, TestResult, SuiteSummary, TestTier } from './types';

// Global test registry
const registry: TestCase[] = [];

/**
 * Register a test case programmatically or via `test(...)` macro
 */
export function test(
  name: string,
  fn: () => void | Promise<void>,
  options?: { id?: string; tier?: TestTier }
): void {
  const tier = options?.tier || inferTierFromNameOrPath(name);
  const id = options?.id || `test_${registry.length + 1}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  registry.push({
    id,
    name,
    tier,
    fn,
  });
  if (typeof (globalThis as any).it === 'function') {
    (globalThis as any).it(name, fn);
  }
}

/**
 * Infer test tier from name or context if not specified
 */
function inferTierFromNameOrPath(name: string): TestTier {
  if (name.includes('Tier 1') || name.includes('T1')) return 'Tier 1';
  if (name.includes('Tier 2') || name.includes('T2')) return 'Tier 2';
  if (name.includes('Tier 3') || name.includes('T3')) return 'Tier 3';
  if (name.includes('Tier 4') || name.includes('T4')) return 'Tier 4';
  if (name.includes('Tier 5') || name.includes('T5')) return 'Tier 5';
  return 'Harness';
}

/**
 * Recursively discover all test files in target directory
 */
function discoverTestFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Exclude node_modules, .git, .next, etc.
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.next') {
        discoverTestFiles(fullPath, fileList);
      }
    } else if (entry.isFile()) {
      if (
        (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) &&
        !entry.name.endsWith('runner.ts')
      ) {
        fileList.push(fullPath);
      }
    }
  }

  return fileList;
}

/**
 * Run all registered tests and produce summary stats
 */
export async function runSuite(): Promise<SuiteSummary> {
  const startTime = Date.now();
  const results: TestResult[] = [];

  const tierBreakdown: Record<TestTier, { total: number; passed: number; failed: number }> = {
    'Tier 1': { total: 0, passed: 0, failed: 0 },
    'Tier 2': { total: 0, passed: 0, failed: 0 },
    'Tier 3': { total: 0, passed: 0, failed: 0 },
    'Tier 4': { total: 0, passed: 0, failed: 0 },
    'Tier 5': { total: 0, passed: 0, failed: 0 },
    Harness: { total: 0, passed: 0, failed: 0 },
  };

  for (const tc of registry) {
    tierBreakdown[tc.tier].total++;
    const t0 = Date.now();
    let passed = false;
    let error: Error | undefined;

    try {
      await tc.fn();
      passed = true;
      tierBreakdown[tc.tier].passed++;
    } catch (err: any) {
      passed = false;
      error = err instanceof Error ? err : new Error(String(err));
      tierBreakdown[tc.tier].failed++;
    }

    const durationMs = Date.now() - t0;
    results.push({
      id: tc.id,
      name: tc.name,
      tier: tc.tier,
      passed,
      error,
      durationMs,
    });
  }

  const durationMs = Date.now() - startTime;
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total,
    passed,
    failed,
    durationMs,
    tierBreakdown,
    results,
  };
}

/**
 * Print formatted summary box and detailed failure reports
 */
export function printSummary(summary: SuiteSummary): void {
  console.log('\n' + '='.repeat(70));
  console.log('                 FIRE PWA E2E TEST SUITE EXECUTION SUMMARY');
  console.log('='.repeat(70));

  for (const res of summary.results) {
    const status = res.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${status}] [${res.tier}] ${res.name} (${res.durationMs}ms)`);
    if (!res.passed && res.error) {
      console.log(`   └─ Error: ${res.error.message}`);
      if (res.error.stack) {
        const stackLines = res.error.stack.split('\n').slice(1, 4);
        console.log(`      ${stackLines.join('\n      ')}`);
      }
    }
  }

  console.log('-'.repeat(70));
  console.log('TIER BREAKDOWN:');
  for (const [tier, stats] of Object.entries(summary.tierBreakdown)) {
    if (stats.total > 0) {
      console.log(
        `  - ${tier.padEnd(8)}: ${stats.passed}/${stats.total} passed (${stats.failed} failed)`
      );
    }
  }

  console.log('-'.repeat(70));
  console.log(
    `TOTAL: ${summary.total} | PASSED: ${summary.passed} | FAILED: ${summary.failed} | DURATION: ${summary.durationMs}ms`
  );
  console.log('='.repeat(70) + '\n');
}

/**
 * CLI Entry Point
 */
export async function main(): Promise<void> {
  const testsDir = path.resolve(process.cwd(), 'tests');
  const testFiles = discoverTestFiles(testsDir);

  console.log(`[TEST RUNNER] Discovered ${testFiles.length} test files in ${testsDir}`);

  for (const file of testFiles) {
    const fileUrl = pathToFileURL(file).href;
    await import(fileUrl);
  }

  console.log(`[TEST RUNNER] Registered ${registry.length} test cases. Executing...`);
  const summary = await runSuite();
  printSummary(summary);

  if (summary.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Auto-run if executed directly as entry script
const isDirectExecution =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === path.resolve(__filename) ||
    process.argv[1].endsWith('runner.ts'));

if (isDirectExecution) {
  main().catch((err) => {
    console.error('Fatal error running test suite runner:', err);
    process.exit(1);
  });
}
