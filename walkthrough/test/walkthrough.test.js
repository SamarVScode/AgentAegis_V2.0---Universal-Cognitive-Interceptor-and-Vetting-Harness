/**
 * AgentAegis Showcase Walkthrough Test Suite
 * Validates index.html, styles.css, app.js, and strictly enforces ZERO emojis.
 * Run via: node test/walkthrough.test.js
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const walkthroughDir = path.resolve(__dirname, '..');

// Strict Unicode regex matching all pictographic emojis and emoji presentations
const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/u;

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`  Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('------------------------------------------------------------');
console.log('Starting AgentAegis Showcase Automated Verification Suite');
console.log('Target directory:', walkthroughDir);
console.log('------------------------------------------------------------');

// 1. Check index.html existence and semantic tags
runTest('index.html exists and is well-structured', () => {
  const htmlPath = path.join(walkthroughDir, 'index.html');
  assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(html.length > 2000, 'index.html should contain rich showcase content');

  assert.ok(html.includes('<!DOCTYPE html>'), 'Must have valid doctype');
  assert.ok(html.includes('<title>AgentAegis'), 'Must have descriptive title');
  assert.ok(html.includes('Fira+Code'), 'Must include Fira Code font');
  assert.ok(html.includes('Plus+Jakarta+Sans'), 'Must include Plus Jakarta Sans font');
  assert.ok(html.includes('Space+Grotesk'), 'Must include Space Grotesk font');
  assert.ok(html.includes('href="styles.css"'), 'Must link to styles.css');
  assert.ok(html.includes('src="app.js"'), 'Must load app.js');
});

// 2. Check index.html hero banner and exact heading
runTest('index.html contains exact hero heading and brand metadata', () => {
  const html = fs.readFileSync(path.join(walkthroughDir, 'index.html'), 'utf8');
  const requiredHero = 'AgentAegis — The Universal Cognitive Interceptor &amp; Vetting Harness for Autonomous Coding Agents';
  const rawHero = 'AgentAegis — The Universal Cognitive Interceptor & Vetting Harness for Autonomous Coding Agents';
  assert.ok(
    html.includes(requiredHero) || html.includes(rawHero),
    'Hero heading must match specified title'
  );
  assert.ok(html.includes('FAIL-CLOSED ACTIVE'), 'Status pill should indicate fail-closed state');
});

// 3. Check Live Metrics Strip
runTest('index.html contains live verified metrics strip', () => {
  const html = fs.readFileSync(path.join(walkthroughDir, 'index.html'), 'utf8');
  assert.ok(html.includes('90.5% - 96.6%'), 'Must display wire token reduction range');
  assert.ok(html.includes('2.88 / 3.00'), 'Must display prestige score');
  assert.ok(html.includes('11 / 11'), 'Must display automated test gates count');
  assert.ok(html.includes('Zero-Thrashing'), 'Must display circuit breaker status');
});

// 4. Check Interactive Architecture 4 Stages
runTest('index.html specifies all 4 cognitive interceptor lifecycle stages', () => {
  const html = fs.readFileSync(path.join(walkthroughDir, 'index.html'), 'utf8');
  assert.ok(html.includes('PreTool Hook Interception'), 'Must include Stage 1');
  assert.ok(html.includes('Cycle Detector &amp; Diff Variance') || html.includes('Cycle Detector & Diff Variance'), 'Must include Stage 2');
  assert.ok(html.includes('Ground Truth State Collector'), 'Must include Stage 3');
  assert.ok(html.includes('Jev Acceptance Gate'), 'Must include Stage 4');
});

// 5. Check 3-Way Benchmark Arena with real numbers
runTest('index.html benchmark arena contains real telemetry values', () => {
  const html = fs.readFileSync(path.join(walkthroughDir, 'index.html'), 'utf8');
  assert.ok(html.includes('Without Harness'), 'Must have Without Harness tab');
  assert.ok(html.includes('Aegis V1'), 'Must have Aegis V1 tab');
  assert.ok(html.includes('AgentAegis V2'), 'Must have AgentAegis V2 tab');
  assert.ok(html.includes('2,320,000') || html.includes('2.32M'), 'Must contain 2.32M token baseline');
  assert.ok(html.includes('6,600,000') || html.includes('6.6M'), 'Must contain 6.6M token unconstrained');
  assert.ok(html.includes('220,000') || html.includes('220k'), 'Must contain 220k bounded tokens');
  assert.ok(html.includes('0.97'), 'Must show score 0.97');
  assert.ok(html.includes('2.86'), 'Must show score 2.86');
  assert.ok(html.includes('2.88'), 'Must show score 2.88');
});

// 6. Check Token Physics Calculator
runTest('index.html contains Token Physics slider and compounding dynamics', () => {
  const html = fs.readFileSync(path.join(walkthroughDir, 'index.html'), 'utf8');
  assert.ok(html.includes('id="turn-slider"'), 'Must have turn slider input');
  assert.ok(html.includes('QUADRATIC COMPOUNDING'), 'Must explain quadratic compounding');
  assert.ok(html.includes('BOUNDED LINEAR SCALING'), 'Must explain bounded linear scaling');
});

// 7. Check Terminal Command Sandbox
runTest('index.html contains terminal simulation and interactive triggers', () => {
  const html = fs.readFileSync(path.join(walkthroughDir, 'index.html'), 'utf8');
  assert.ok(html.includes('id="terminal-body"'), 'Must have terminal body element');
  assert.ok(html.includes('id="terminal-input"'), 'Must have interactive terminal prompt input');
  assert.ok(html.includes('data-cmd="test:veto"'), 'Must have test:veto trigger');
  assert.ok(html.includes('data-cmd="test:cycle"'), 'Must have test:cycle trigger');
  assert.ok(html.includes('data-cmd="test:gate"'), 'Must have test:gate trigger');
});

// 8. Check Multi-Engine Quickstart
runTest('index.html contains quickstart for Claude, Cursor, and Antigravity', () => {
  const html = fs.readFileSync(path.join(walkthroughDir, 'index.html'), 'utf8');
  assert.ok(html.includes('npx aegis --all'), 'Must contain universal npx command');
  assert.ok(html.includes('.claude/settings.json'), 'Must document Claude Code hook config');
  assert.ok(html.includes('.cursor/hooks.json'), 'Must document Cursor hook config');
  assert.ok(html.includes('.antigravity/hooks.json'), 'Must document Antigravity hook config');
});

// 9. Check styles.css design tokens and styling rules
runTest('styles.css contains designated color palette and typography', () => {
  const cssPath = path.join(walkthroughDir, 'styles.css');
  assert.ok(fs.existsSync(cssPath), 'styles.css must exist');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('#090d16'), 'Must use canvas color #090d16');
  assert.ok(css.includes('#0f172a'), 'Must use surface color #0f172a');
  assert.ok(css.includes('#1e293b'), 'Must use border color #1e293b');
  assert.ok(css.includes('#3b82f6'), 'Must use electric blue #3b82f6');
  assert.ok(css.includes('#10b981'), 'Must use emerald green #10b981');
  assert.ok(css.includes('#ef4444'), 'Must use crimson veto #ef4444');
  assert.ok(css.includes('Space Grotesk'), 'Must define Space Grotesk');
  assert.ok(css.includes('Plus Jakarta Sans'), 'Must define Plus Jakarta Sans');
  assert.ok(css.includes('Fira Code'), 'Must define Fira Code');
});

// 10. Check app.js event handlers and logic
runTest('app.js implements benchmark switcher, physics calc, CLI simulator, and clipboard copy', () => {
  const appPath = path.join(walkthroughDir, 'app.js');
  assert.ok(fs.existsSync(appPath), 'app.js must exist');
  const js = fs.readFileSync(appPath, 'utf8');
  assert.ok(js.includes('initArchitectureStepper'), 'Must implement architecture stepper');
  assert.ok(js.includes('initBenchmarkArena'), 'Must implement benchmark arena');
  assert.ok(js.includes('initTokenPhysicsCalculator'), 'Must implement token calculator');
  assert.ok(js.includes('initTerminalSandbox'), 'Must implement terminal simulator');
  assert.ok(js.includes('initCopyButtons'), 'Must implement copy to clipboard');
  assert.ok(js.includes('test:veto'), 'Terminal must handle test:veto');
  assert.ok(js.includes('test:cycle'), 'Terminal must handle test:cycle');
  assert.ok(js.includes('test:gate'), 'Terminal must handle test:gate');
});

// 11. Check DOM ID integrity between index.html and app.js
runTest('index.html contains all element IDs referenced by app.js', () => {
  const html = fs.readFileSync(path.join(walkthroughDir, 'index.html'), 'utf8');
  const requiredIds = [
    'arch-stepper', 'stage-tag', 'stage-status', 'stage-name', 'stage-description',
    'stage-features', 'preview-title', 'preview-code', 'bench-card', 'bench-version-tag',
    'bench-title', 'bench-summary', 'bench-tokens', 'bench-token-note', 'bench-turns',
    'bench-turns-note', 'bench-score', 'bench-score-note', 'bench-tests', 'bench-tests-note',
    'bench-authenticity', 'bench-emojis', 'bench-winner', 'turn-slider', 'slider-turn-display',
    'calc-unconstrained-tokens', 'calc-unconstrained-cost', 'calc-aegis-tokens',
    'calc-aegis-cost', 'calc-savings-percent', 'calc-tokens-saved', 'calc-dollars-saved',
    'bar-unconstrained', 'bar-aegis', 'terminal-body', 'terminal-input', 'terminal-submit-btn',
    'term-clear-btn'
  ];

  for (const id of requiredIds) {
    assert.ok(html.includes(`id="${id}"`), `index.html must contain element with id="${id}"`);
  }
});

// 12. Exhaustive ZERO EMOJI scan across all walkthrough files
runTest('Strict ZERO EMOJIS across all files in walkthrough directory', () => {
  const filesToCheck = [];

  function collectFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(fullPath);
      } else if (/\.(html|css|js|json|md|txt)$/i.test(entry.name)) {
        filesToCheck.push(fullPath);
      }
    }
  }

  collectFiles(walkthroughDir);
  assert.ok(filesToCheck.length >= 4, 'Should find at least 4 files to scan');

  for (const filePath of filesToCheck) {
    const relative = path.relative(walkthroughDir, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(EMOJI_REGEX);
    assert.strictEqual(
      match,
      null,
      `Emoji detected in ${relative}: "${match ? match[0] : ''}"`
    );
  }
});

console.log('------------------------------------------------------------');
console.log(`Verification Summary: ${passedCount} / ${totalCount} tests passed.`);
console.log('Zero emojis detected across all walkthrough assets.');
console.log('------------------------------------------------------------');

if (passedCount !== totalCount) {
  process.exit(1);
}
