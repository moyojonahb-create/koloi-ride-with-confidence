#!/usr/bin/env node
/**
 * The increment gate. One command, one exit code.
 *
 * This exists because a green test run twice masked a broken typecheck:
 * vitest does not typecheck, so `packages/core` shipped a real TS2493 while
 * 89 tests passed, and the `.js`-extension bug before that bundled-failed while
 * `tsc` was clean. Different resolvers, different failures — checking one and
 * reporting "gates green" is how both got through.
 *
 * Every gate runs even if an earlier one fails, so a single run reports every
 * problem rather than the first. Exit code is non-zero if any gate failed.
 *
 * Usage:  node scripts/verify.mjs
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = path.join(ROOT, 'packages/core');
const MOBILE = path.join(ROOT, 'apps/mobile');
const METRO_PORT = 8081;

/** Paths that belong to the web app and must stay byte-identical. */
const WEB_PATHS = [
  'src/', 'index.html', 'vite.config.ts', 'vitest.config.ts', 'tailwind.config.ts',
  'postcss.config.js', 'eslint.config.js', 'tsconfig.json', 'tsconfig.app.json',
  'tsconfig.node.json', 'package.json', 'package-lock.json', 'capacitor.config.ts',
  'components.json', 'public/', 'supabase/', 'backend/', 'android/',
];

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  process.stdout.write(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`);
};

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe', shell: true });
}

function gate(name, fn) {
  process.stdout.write(`\n> ${name}\n`);
  try {
    const detail = fn();
    record(name, true, detail);
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim() || error.message;
    record(name, false, out.split('\n').slice(0, 6).join('\n         '));
  }
}

// ── 1. typecheck both packages ───────────────────────────────────────────────
gate('core typecheck', () => {
  run('npx', ['--no-install', 'tsc', '--noEmit'], CORE);
  return 'tsc --noEmit clean';
});

gate('mobile typecheck', () => {
  run('npx', ['--no-install', 'tsc', '--noEmit'], MOBILE);
  return 'tsc --noEmit clean';
});

// ── 2. core test suite ───────────────────────────────────────────────────────
gate('core test suite', () => {
  const out = run('npx', ['vitest', 'run', '--config', 'packages/core/vitest.config.ts'], ROOT);
  // Strip ANSI before matching — vitest colours its summary, and an unstripped
  // regex silently degrades the report to a bare "passed" with no count.
  // eslint-disable-next-line no-control-regex
  const plain = out.replace(/\[[0-9;]*m/g, '');
  const m = plain.match(/Tests\s+(\d+) passed/);
  return m ? `${m[1]} passed` : 'passed (count not parsed)';
});

// ── 3. both platform bundles ─────────────────────────────────────────────────
// Metro is reused when already running, since a dev session usually has one up.
// When it is not, one is started and torn down again so the gate is standalone.
let metro = null;

async function metroUp() {
  try {
    const res = await fetch(`http://127.0.0.1:${METRO_PORT}/status`, { signal: AbortSignal.timeout(3000) });
    return (await res.text()).includes('running');
  } catch {
    return false;
  }
}

const alreadyUp = await metroUp();
if (!alreadyUp) {
  process.stdout.write('\n> starting Metro (none running)\n');
  metro = spawn('npx', ['expo', 'start', '--dev-client', '--host', 'lan'], {
    cwd: MOBILE, stdio: 'ignore', shell: true, detached: false,
  });
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline && !(await metroUp())) {
    await new Promise((r) => setTimeout(r, 2000));
  }
}

for (const platform of ['android', 'ios']) {
  // eslint-disable-next-line no-await-in-loop
  await (async () => {
    process.stdout.write(`\n> ${platform} bundle\n`);
    try {
      const url = `http://127.0.0.1:${METRO_PORT}/index.bundle?platform=${platform}&dev=true&minify=false`;
      const res = await fetch(url, { signal: AbortSignal.timeout(900_000) });
      const body = await res.text();
      const valid = res.status === 200 && body.includes('__BUNDLE_START_TIME__');
      record(
        `${platform} bundle`,
        valid,
        valid ? `${body.length.toLocaleString()} bytes` : `status ${res.status}: ${body.slice(0, 300)}`,
      );
    } catch (error) {
      record(`${platform} bundle`, false, error.message);
    }
  })();
}

if (metro) metro.kill();

// ── 4. web app untouched ─────────────────────────────────────────────────────
gate('web byte-identical', () => {
  const present = WEB_PATHS.filter((p) => existsSync(path.join(ROOT, p)));
  const out = run('git', ['status', '--porcelain', '--', ...present], ROOT).trim();
  if (out) throw new Error(`web app modified:\n${out}`);
  return `${present.length} paths unchanged`;
});

// ── summary ──────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok);
process.stdout.write(`\n${'='.repeat(60)}\n`);
process.stdout.write(`  ${results.length - failed.length}/${results.length} gates passed\n`);
if (failed.length) {
  process.stdout.write(`  FAILED: ${failed.map((f) => f.name).join(', ')}\n`);
}
process.stdout.write(`${'='.repeat(60)}\n`);
process.exit(failed.length ? 1 : 0);
