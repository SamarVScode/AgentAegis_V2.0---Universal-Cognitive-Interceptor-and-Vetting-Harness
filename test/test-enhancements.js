/**
 * Unit Test Suite for Jev Harness Enhancements
 * Tests:
 * 1. Session TTL Pruning in harness/cycle-detector.js
 * 2. Timeout & Fail-Open/Closed Policy in harness/jev-vetter.js
 * 3. One-Click Hook Installer in harness/install.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pruneOldSessions, loadSession, saveSession, getSessionPaths } from '../harness/cycle-detector.js';
import { isDestructiveAction, queryJevViaMcp } from '../harness/jev-vetter.js';
import { detectEngine, buildMergedHooksConfig, installHooks } from '../harness/install.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING JEV HARNESS ENHANCEMENT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`[FAIL] FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passed++;
    console.log(`[PASS] PASS: ${message}`);
  }

  // ----------------------------------------------------
  // Test 1: Session TTL Pruning in cycle-detector.js
  // ----------------------------------------------------
  console.log('\n--- 1. Session TTL Pruning Tests ---');
  const tempJevDir = path.join(__dirname, '..', '.test_jev_sessions');
  if (fs.existsSync(tempJevDir)) fs.rmSync(tempJevDir, { recursive: true, force: true });
  fs.mkdirSync(tempJevDir, { recursive: true });

  // Create 30 mock session folders
  const now = Date.now();
  for (let i = 0; i < 30; i++) {
    const sDir = path.join(tempJevDir, `sess_${String(i).padStart(2, '0')}`);
    fs.mkdirSync(sDir);
    // Even sessions are recent (< 10 hours), odd sessions are old (> 50 hours)
    const ageHours = (i % 2 === 0) ? (i * 0.5) : (50 + i);
    const mtime = (now - ageHours * 3600 * 1000) / 1000;
    fs.utimesSync(sDir, mtime, mtime);
  }

  pruneOldSessions(20, 48, tempJevDir);
  const remainingDirs = fs.readdirSync(tempJevDir);
  assert(remainingDirs.length <= 20, `Pruning enforced maxSessions: remaining ${remainingDirs.length} <= 20`);
  
  // Verify no session older than 48 hours survived
  const survivedAllRecent = remainingDirs.every(d => {
    const stats = fs.statSync(path.join(tempJevDir, d));
    const ageHours = (now - stats.mtimeMs) / (3600 * 1000);
    return ageHours <= 48.01;
  });
  assert(survivedAllRecent, 'All sessions older than 48 hours were successfully pruned');

  // Verify safe error handling on nonexistent directory
  pruneOldSessions(20, 48, path.join(tempJevDir, 'nonexistent'));
  assert(true, 'Safe error handling when pruning nonexistent directory does not crash');

  // Clean up
  fs.rmSync(tempJevDir, { recursive: true, force: true });

  // ----------------------------------------------------
  // Test 2: Network Timeout & Fail-Open/Closed in jev-vetter.js
  // ----------------------------------------------------
  console.log('\n--- 2. Destructive Detection & Fail-Safe Timeout Tests ---');

  // Test destructive patterns
  const destructiveList = [
    { proposed_tool: 'run_command', tool_args: { command: 'rm -rf /var/data' }, label: 'rm -rf' },
    { proposed_tool: 'run_command', tool_args: { CommandLine: 'rmdir /s /q temp' }, label: 'rmdir' },
    { proposed_tool: 'run_command', tool_args: { CommandLine: 'git reset --hard HEAD~1' }, label: 'git reset --hard' },
    { proposed_tool: 'run_command', tool_args: { script: 'DROP DATABASE live_db;' }, label: 'DROP DATABASE' },
    { proposed_tool: 'run_command', tool_args: { command: 'DELETE FROM users WHERE 1=1' }, label: 'DELETE FROM' },
    { proposed_tool: 'run_command', tool_args: { cmd: 'TRUNCATE TABLE audit_log' }, label: 'TRUNCATE' },
    { proposed_tool: 'run_command', tool_args: { command: 'taskkill /F /PID 4200' }, label: 'taskkill' },
    { proposed_tool: 'write_to_file', tool_args: { TargetFile: 'critical.js', Overwrite: true, CodeContent: '' }, label: 'destructive file wipe' }
  ];

  for (const item of destructiveList) {
    assert(isDestructiveAction(item), `Detected destructive pattern: ${item.label}`);
  }

  // Test benign actions
  const benignList = [
    { proposed_tool: 'view_file', tool_args: { AbsolutePath: 'index.js' }, label: 'view_file' },
    { proposed_tool: 'replace_file_content', tool_args: { TargetFile: 'index.js', TargetContent: 'a', ReplacementContent: 'b' }, label: 'replace_file_content' },
    { proposed_tool: 'run_command', tool_args: { CommandLine: 'npm test' }, label: 'npm test execution' },
    { proposed_tool: 'run_command', tool_args: { CommandLine: 'node server.js' }, label: 'standard node execution' }
  ];

  for (const item of benignList) {
    assert(!isDestructiveAction(item), `Benign action cleared as non-destructive: ${item.label}`);
  }

  // Test timeout fail-closed on destructive
  const destructiveTimeoutRes = await queryJevViaMcp(destructiveList[0], 1);
  assert(destructiveTimeoutRes.approved === false, 'Timeout on destructive operation results in FAIL-CLOSED (approved: false)');
  assert(destructiveTimeoutRes.isHazard === true, 'Timeout on destructive operation marks isHazard: true');
  assert(destructiveTimeoutRes.reason.includes('Blocked for safety'), 'Timeout on destructive operation contains safety warning');

  // Test timeout fail-open on benign
  const benignTimeoutRes = await queryJevViaMcp(benignList[1], 1);
  assert(benignTimeoutRes.approved === true, 'Timeout on benign operation results in FAIL-OPEN (approved: true)');
  assert(benignTimeoutRes.isHazard === false, 'Timeout on benign operation marks isHazard: false');
  assert(benignTimeoutRes.reason.includes('failing open for benign action'), 'Timeout on benign operation contains fail-open warning');

  // ----------------------------------------------------
  // Test 3: One-Click Hook Installer in install.js
  // ----------------------------------------------------
  console.log('\n--- 3. Hook Installer Tests ---');

  // Dry run
  const dryRunRes = installHooks({ engine: 'antigravity', dryRun: true });
  assert(dryRunRes.dryRun === true, 'Installer respects --dry-run flag without writing');
  assert(dryRunRes.config.hooks.PreToolUse[0].command.includes('--engine antigravity pre-tool'), 'PreToolUse command generated correctly');
  assert(dryRunRes.config.hooks.Stop[0].command.includes('--engine antigravity verify-gate'), 'Stop command generated correctly');

  // Auto-detection
  const engineDetected = detectEngine(process.cwd());
  assert(['antigravity', 'claude'].includes(engineDetected), `Engine auto-detected as '${engineDetected}'`);

  // Merging and idempotency
  const mockExisting = {
    hooks: {
      PreToolUse: [{ command: 'npx eslint' }],
      PostToolUse: [{ command: 'echo done' }]
    }
  };
  const merged = buildMergedHooksConfig(mockExisting, 'claude');
  assert(merged.hooks.PreToolUse.length === 2, 'PreToolUse preserved existing hook and added Jev hook');
  assert(merged.hooks.PostToolUse.length === 1, 'PostToolUse preserved unchanged');
  assert(merged.hooks.Stop.length === 1, 'Stop hook added');
  assert(merged.hooks.PreToolUse[1].command.includes('--engine claude'), 'Engine parameter correctly embedded');

  console.log('\n====================================================');
  console.log(`ALL ENHANCEMENT TESTS PASSED: ${passed}/${total}`);
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n[FAIL] Enhancement test suite failed:\n', err);
  process.exit(1);
});
