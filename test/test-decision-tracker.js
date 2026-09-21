/**
 * Decision Tracker & Audit Logger Test Suite (test/test-decision-tracker.js)
 * Deterministically tests decision recording, retrieval, aggregation, and CLI dispatch.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import {
  recordDecision,
  getDecisionHistory,
  getDecisionSummary,
  formatDecisionSummary,
  clearDecisionHistory,
  getAuditLogPath
} from '../harness/decision-tracker.js';
import { safeSpawnAsync } from '../harness/acceptance-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, '..', '.test-decision-audit-tmp');

async function runTrackerTests() {
  console.log('--- Starting Decision Tracker Unit & Integration Tests ---');

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  try {
    // 1. Clear any prior test logs
    clearDecisionHistory({ targetDir: testDir });
    const initialHistory = getDecisionHistory({ targetDir: testDir });
    assert.strictEqual(initialHistory.length, 0, 'Initial history should be empty');
    console.log('[PASS] 1. Initial state cleanly cleared');

    // 2. Record simulated decisions across different iterations and lifecycle phases
    const rec1 = recordDecision({
      targetDir: testDir,
      sessionId: 'session-alpha',
      iteration: 1,
      source: 'sensitive_guard',
      decisionType: 'credential_read_veto',
      toolName: 'view_file',
      inputSummary: '.env',
      passed: false,
      verdict: 'vetoed',
      latencyMs: 1.2,
      reason: 'Direct access to .env credential file blocked'
    });
    assert(rec1 && rec1.id, 'Record 1 should have an id');

    const rec2 = recordDecision({
      targetDir: testDir,
      sessionId: 'session-alpha',
      iteration: 1,
      source: 'jev_system_one',
      decisionType: 'destructive_vetting',
      toolName: 'run_command',
      inputSummary: 'git reset --hard HEAD~1',
      passed: false,
      verdict: 'vetoed',
      noul: 0.12,
      probability: 0.88,
      latencyMs: 420.5,
      reason: 'Destructive git reset rejected by safety policy'
    });
    assert(rec2 && rec2.noul === 0.12, 'Record 2 should store noul score');

    const rec3 = recordDecision({
      targetDir: testDir,
      sessionId: 'session-alpha',
      iteration: 2,
      source: 'cycle_detector',
      decisionType: 'cycle_thrash_veto',
      toolName: 'replace_file_content',
      inputSummary: 'src/app.js (hash: 8f92a10b)',
      passed: false,
      verdict: 'vetoed',
      latencyMs: 3.8,
      reason: 'Thrashing pattern detected on src/app.js (Turn 3/5)'
    });
    assert(rec3, 'Record 3 should succeed');

    const rec4 = recordDecision({
      targetDir: testDir,
      sessionId: 'session-alpha',
      iteration: 3,
      source: 'test_runner',
      decisionType: 'post_tool_test_tracking',
      toolName: 'Bash',
      inputSummary: 'npm test',
      passed: true,
      verdict: 'passed',
      latencyMs: 1250.0,
      reason: 'Test runner exited cleanly with code 0'
    });
    assert(rec4, 'Record 4 should succeed');

    const rec5 = recordDecision({
      targetDir: testDir,
      sessionId: 'session-alpha',
      iteration: 3,
      source: 'acceptance_gate',
      decisionType: 'stage_1_5_claim_reconciliation',
      toolName: 'verifyAcceptanceGate',
      inputSummary: 'all tests pass',
      passed: true,
      verdict: 'passed',
      probability: 1.0,
      latencyMs: 15.0,
      reason: 'Claims reconciled with disk existence and test telemetry'
    });
    assert(rec5, 'Record 5 should succeed');

    console.log('[PASS] 2. Successfully recorded 5 structured decisions');

    // 3. Test history retrieval and filtering
    const allDecisions = getDecisionHistory({ targetDir: testDir });
    assert.strictEqual(allDecisions.length, 5, 'Should retrieve all 5 decisions');

    const jevDecisions = getDecisionHistory({ targetDir: testDir, filterType: 'destructive_vetting' });
    assert.strictEqual(jevDecisions.length, 1, 'Should filter by decisionType');
    assert.strictEqual(jevDecisions[0].toolName, 'run_command');

    const limited = getDecisionHistory({ targetDir: testDir, limit: 2 });
    assert.strictEqual(limited.length, 2, 'Should respect limit option');
    console.log('[PASS] 3. History retrieval, filtering, and pagination verified');

    // 4. Test summary statistics aggregation
    const summary = getDecisionSummary({ targetDir: testDir });
    assert.strictEqual(summary.totalDecisions, 5, 'Total decisions should be 5');
    assert.strictEqual(summary.vetoedCount, 3, 'Vetoed count should be 3');
    assert.strictEqual(summary.approvedCount, 2, 'Approved count should be 2');
    assert.strictEqual(summary.activeSessions, 1, 'Active sessions should be 1');
    assert.strictEqual(summary.bySource['jev_system_one'], 1);
    assert.strictEqual(summary.bySource['cycle_detector'], 1);
    assert.strictEqual(summary.bySource['acceptance_gate'], 1);
    assert(summary.decisionsPerIteration > 0, 'Should calculate decisions per iteration');
    assert(summary.averageLatencyMs > 0, 'Should calculate average latency');
    console.log('[PASS] 4. Summary metrics aggregation mathematically verified');

    // 5. Test formatted output rendering
    const formatted = formatDecisionSummary(summary);
    assert(formatted.includes('AGENTAEGIS COGNITIVE DECISION AUDIT'), 'Header should be present');
    assert(formatted.includes('Total Decisions Recorded:  5'), 'Total decisions in output');
    assert(formatted.includes('Decisions Per Iteration:'), 'Decisions per iteration in output');
    // Ensure ZERO emojis in formatted output
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert(!emojiRegex.test(formatted), 'Formatted summary must contain ZERO emojis');
    console.log('[PASS] 5. Zero-emoji CLI text formatting verified');

    // 6. Test CLI execution of `node bin/cli.js decisions`
    const cliRes = await safeSpawnAsync(`node bin/cli.js decisions --target-dir "${testDir}"`, {
      cwd: path.resolve(__dirname, '..')
    });
    assert.strictEqual(cliRes.code, 0, 'CLI decisions command should exit 0');
    assert(cliRes.stdout.includes('AGENTAEGIS COGNITIVE DECISION AUDIT'), 'CLI output should contain audit summary');
    console.log('[PASS] 6. CLI dispatch `aegis decisions` verified');

    // 7. Test CLI execution of `node bin/cli.js decisions --json`
    const jsonCliRes = await safeSpawnAsync(`node bin/cli.js decisions --target-dir "${testDir}" --json`, {
      cwd: path.resolve(__dirname, '..')
    });
    assert.strictEqual(jsonCliRes.code, 0, 'CLI --json command should exit 0');
    const parsedJson = JSON.parse(jsonCliRes.stdout);
    assert(Array.isArray(parsedJson) && parsedJson.length === 5, 'JSON output should be an array of 5 records');
    console.log('[PASS] 7. CLI dispatch `aegis decisions --json` verified');

    // 8. Test clearing history
    clearDecisionHistory({ targetDir: testDir });
    const clearedHistory = getDecisionHistory({ targetDir: testDir });
    assert.strictEqual(clearedHistory.length, 0, 'History should be empty after clearing');
    console.log('[PASS] 8. Clear history verified');

    console.log('\n======================================================');
    console.log('ALL 8 DECISION TRACKER TESTS PASSED (0 FAILURES)');
    console.log('======================================================\n');
  } finally {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  }
}

runTrackerTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
