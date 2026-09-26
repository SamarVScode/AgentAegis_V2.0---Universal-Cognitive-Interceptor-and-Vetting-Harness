import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

import { parseTestRunnerOutput } from '../harness/runner-parser.js';
import { normalizeStructure } from '../harness/diff-variance.js';
import { inspectCommandForSensitivePaths } from '../harness/sensitive-guard.js';
import { collectState } from '../harness/state-collector.js';
import { findAuditLogPath, DEFAULT_AUDIT_FILENAME } from '../harness/decision-tracker.js';

console.log('================================================================================');
console.log('STARTING BATCH 3 HARDENING VERIFICATION SUITE');
console.log('Items: 9, 11, 12, 13, 14, 15, 16, 18');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// Test 1: Item 14 - normalizeStructure preserves file:/// URLs
// -----------------------------------------------------------------------------
console.log('--- [Test 1: Item 14 - normalizeStructure file:/// preservation] ---');
{
  const textWithFileUrl = 'const uri = "file:///Users/dev/project/index.js"; // some comment';
  const normalized = normalizeStructure(textWithFileUrl);
  assert(normalized.includes('file:///Users/dev/project/index.js'), 'file:/// URL must be preserved intact');
  assert(!normalized.includes('some comment'), 'Line comment must be stripped');

  const textWithHttp = 'const u1 = "https://example.com/foo"; const u2 = "file:///tmp/test";';
  const normBoth = normalizeStructure(textWithHttp);
  assert(normBoth.includes('https://example.com/foo'), 'https:// URL preserved');
  assert(normBoth.includes('file:///tmp/test'), 'file:/// URL preserved alongside https://');
  console.log('[PASS] normalizeStructure preserves file:/// and https:// URLs cleanly.');
}

// -----------------------------------------------------------------------------
// Test 2: Item 13 - parseTestRunnerOutput GAS options and build check
// -----------------------------------------------------------------------------
console.log('\n--- [Test 2: Item 13 - parseTestRunnerOutput GAS options] ---');
{
  // 1. Build check via options.command
  const resClaspStatus = parseTestRunnerOutput('gas', '', '', 0, { command: 'clasp status' });
  assert.strictEqual(resClaspStatus.passed, true);
  assert.strictEqual(resClaspStatus.isBuildVerification, true);
  assert.strictEqual(resClaspStatus.reason, 'Google Apps Script build / manifest verified cleanly.');

  // 2. Build check via options.testCommand
  const resTsc = parseTestRunnerOutput('gas', '', '', 0, { testCommand: 'tsc --noEmit' });
  assert.strictEqual(resTsc.passed, true);
  assert.strictEqual(resTsc.isBuildVerification, true);

  // 3. Test command
  const resTest = parseTestRunnerOutput('gas', '1 test passed', '', 0, { command: 'npm test' });
  assert.strictEqual(resTest.passed, true);
  assert.strictEqual(resTest.isBuildVerification, false);
  assert.strictEqual(resTest.reason, 'GAS tests passed.');

  // 4. Default options fallback
  const resDefault = parseTestRunnerOutput('gas', 'clean output', '', 0);
  assert.strictEqual(resDefault.passed, true);
  console.log('[PASS] parseTestRunnerOutput accepts options as 5th argument and classifies GAS build vs test commands.');
}

// -----------------------------------------------------------------------------
// Test 3: Item 11 - collectState targetFileAst slice limit up to 30,000 chars
// -----------------------------------------------------------------------------
console.log('\n--- [Test 3: Item 11 - collectState 30k targetFileAst slice limit] ---');
{
  const largeContent = 'X'.repeat(25000);
  const state = collectState('Task', 'write_to_file', {}, 'default', '', null, {
    workingFileContent: largeContent,
    cwd: process.cwd()
  });
  assert.strictEqual(state.target_file_ast.length, 25000, 'target_file_ast must retain 25,000 characters without 4k clamp');

  const oversizeContent = 'Y'.repeat(35000);
  const stateCapped = collectState('Task', 'write_to_file', {}, 'default', '', null, {
    workingFileContent: oversizeContent,
    cwd: process.cwd()
  });
  assert.strictEqual(stateCapped.target_file_ast.length, 30000, 'target_file_ast must be capped at 30,000 characters');
  console.log('[PASS] collectState slices targetFileAst to 30,000 characters.');
}

// -----------------------------------------------------------------------------
// Test 4: Item 15 - inspectCommandForSensitivePaths sanitizes grep/rg/echo
// -----------------------------------------------------------------------------
console.log('\n--- [Test 4: Item 15 - inspectCommandForSensitivePaths sanitization] ---');
{
  // Searching for ".env" inside a grep or rg pattern should NOT trigger sensitive block
  const grepCmd = 'grep -rn ".env" src/';
  const checkGrep = inspectCommandForSensitivePaths(grepCmd, 'C:/temp/test-repo');
  assert.strictEqual(checkGrep.isSensitive, false, 'grep search for .env should be sanitized');

  const rgCmd = 'rg "id_rsa" ./docs';
  const checkRg = inspectCommandForSensitivePaths(rgCmd, 'C:/temp/test-repo');
  assert.strictEqual(checkRg.isSensitive, false, 'rg search for id_rsa should be sanitized');

  // Echoing a string containing .env or key should NOT trigger sensitive block
  const echoCmd = 'echo "Remember to copy .env.example to .env"';
  const checkEcho = inspectCommandForSensitivePaths(echoCmd, 'C:/temp/test-repo');
  assert.strictEqual(checkEcho.isSensitive, false, 'echo containing .env should be sanitized');

  // But ACTUAL access / reading of .env must still be blocked!
  const catCmd = 'cat .env';
  const checkCat = inspectCommandForSensitivePaths(catCmd, 'C:/temp/test-repo');
  assert.strictEqual(checkCat.isSensitive, true, 'cat .env must still be flagged as sensitive');

  const readKeyCmd = 'Get-Content ~/.ssh/id_rsa';
  const checkKey = inspectCommandForSensitivePaths(readKeyCmd, 'C:/temp/test-repo');
  assert.strictEqual(checkKey.isSensitive, true, 'Reading id_rsa must still be flagged as sensitive');

  console.log('[PASS] inspectCommandForSensitivePaths sanitizes search & echo literals while preserving credential read guards.');
}

// -----------------------------------------------------------------------------
// Test 5: Item 12 - findAuditLogPath monorepo boundary isolation
// -----------------------------------------------------------------------------
console.log('\n--- [Test 5: Item 12 - findAuditLogPath monorepo boundary isolation] ---');
{
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-monorepo-test-'));
  try {
    const parentDir = path.join(tmpBase, 'parent-repo');
    const childDir = path.join(parentDir, 'packages', 'child-pkg');
    fs.mkdirSync(path.join(parentDir, '.git'), { recursive: true });
    fs.mkdirSync(path.join(parentDir, '.aegis'), { recursive: true });
    fs.writeFileSync(path.join(parentDir, '.aegis', DEFAULT_AUDIT_FILENAME), '{"parent":true}\n');

    // Child repo has its own .git
    fs.mkdirSync(path.join(childDir, '.git'), { recursive: true });
    fs.mkdirSync(path.join(childDir, 'src'), { recursive: true });

    // When searching from childDir/src, because childDir has .git, it must NOT bleed into parent .aegis
    const resolvedPath = findAuditLogPath(path.join(childDir, 'src'));
    assert(resolvedPath.startsWith(path.join(childDir, 'src')) || resolvedPath.startsWith(childDir), 
      `Should resolve inside child repository, got: ${resolvedPath}`);
    assert(!resolvedPath.startsWith(parentDir + path.sep + '.aegis'), 
      'Should not bleed into parent repo .aegis log');
  } finally {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }
  console.log('[PASS] findAuditLogPath stops search at git boundary in monorepos.');
}

// -----------------------------------------------------------------------------
// Test 6: Item 18 - cycle-detector.js comment naming
// -----------------------------------------------------------------------------
console.log('\n--- [Test 6: Item 18 - cycle-detector.js comment naming] ---');
{
  const cycleDetectorSrc = fs.readFileSync(path.join(process.cwd(), 'harness', 'cycle-detector.js'), 'utf8');
  assert(!cycleDetectorSrc.includes('.jev/<sessionId>/shadow/'), 'Old .jev shadow comment must be updated');
  assert(cycleDetectorSrc.includes('~/.aegis-harness/<sessionId>/shadow/'), 'New ~/.aegis-harness/ shadow comment present');
  assert(!cycleDetectorSrc.includes('Prunes old session directories from .jev/'), 'Old .jev prune comment must be updated');
  assert(cycleDetectorSrc.includes('Prunes old session directories from ~/.aegis-harness/'), 'New ~/.aegis-harness/ prune comment present');
  console.log('[PASS] cycle-detector.js JSDoc comments verified.');
}

// -----------------------------------------------------------------------------
// Test 7: Item 9 & Item 16 - acceptance-gate.js maxBuffer and spawnSync verification
// -----------------------------------------------------------------------------
console.log('\n--- [Test 7: Item 9 & 16 - acceptance-gate.js code verification] ---');
{
  const gateSrc = fs.readFileSync(path.join(process.cwd(), 'harness', 'acceptance-gate.js'), 'utf8');
  assert(!gateSrc.includes("err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'"), 'Dead err.code check removed');
  assert(!gateSrc.includes("err.code === 'MAXBUFFER'"), 'Dead MAXBUFFER check removed');
  assert(gateSrc.includes("} else if (err.isMaxBuffer) {"), 'err.isMaxBuffer check preserved');
  assert(gateSrc.includes("import { exec, spawn, spawnSync } from 'child_process';"), 'spawnSync imported');
  assert(gateSrc.includes("spawnSync('taskkill', ['/pid', child.pid.toString(), '/T', '/F']);"), 'spawnSync taskkill present');
  console.log('[PASS] acceptance-gate.js maxBuffer and synchronous taskkill verified.');
}

console.log('\n================================================================================');
console.log('ALL BATCH 3 HARDENING TESTS PASSED: 7/7 (0 FAILURES)');
console.log('================================================================================');
