import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { collectState } from '../harness/state-collector.js';
import { jevBooleanCheck } from '../harness/jev-client.js';
import { recordDecision, getDecisionHistory } from '../harness/decision-tracker.js';
import { safeSpawnAsync } from '../harness/acceptance-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function testLiveJevSevenPillars() {
  console.log('================================================================================');
  console.log('TESTING LIVE JEV SYSTEM ONE INTEGRATION WITH 7-PILLARS CONTEXT & CODE DIFFS');
  console.log('Target API: https://api.typesafe.ai/v1/systemone | Model: jev-1.13.0');
  console.log('================================================================================\n');

  // Step 1: Collect 7 Pillars of precision context from the real active workspace
  const sessionId = 'test-live-pillars-session';
  const taskDescription = 'Harden cognitive interceptor and verify 7-pillar context telemetry';
  const proposedTool = 'run_command';
  const toolArgs = { CommandLine: 'git reset --soft HEAD~1' };

  const stateOptions = {
    workingFileContent: 'export function interceptor() { return true; }',
    rollingHistory: [
      'replace_file_content:harness/interceptor.js:sha256(a1b2c3d4)',
      'run_command:npm test:sha256(e5f6g7h8)'
    ],
    lastStderr: '',
    lastTestPassed: true,
    authorization: { workspace_root: rootDir, role: 'developer' },
    runtimeMetadata: { platform: process.platform, node_version: process.version, arch: process.arch }
  };

  console.log('1. Collecting 7 Pillars precision context envelope...');
  const state = collectState(taskDescription, proposedTool, toolArgs, sessionId, '', 'localized', stateOptions);

  assert(state.task, 'Pillar 1 (User Intent) must exist');
  assert(state.proposed_tool, 'Pillar 2 (Proposed Action) must exist');
  assert(state.target_file_ast, 'Pillar 3 (Target File AST) must exist');
  assert(state.git_diff !== undefined, 'Pillar 4 (Git Diff) must exist');
  assert(state.causal_trajectory, 'Pillar 5 (Causal Trajectory) must exist');
  assert(state.workspace, 'Pillar 6 (Verification Contract) must exist');
  assert(state.authorization_boundary, 'Pillar 7 (Authorization Boundary) must exist');

  console.log('[PASS] 7 Pillars collected successfully:');
  console.log(`  - Pillar 1 (Intent)      : "${state.task.slice(0, 60)}..."`);
  console.log(`  - Pillar 2 (Tool & OS)   : ${state.proposed_tool} on ${state.tool_args.runtime_metadata?.platform}`);
  console.log(`  - Pillar 3 (AST Slice)   : ${state.target_file_ast.slice(0, 50)}...`);
  console.log(`  - Pillar 4 (Git Status)  : ${state.git_status.replace(/\n/g, ', ') || '(clean)'}`);
  console.log(`  - Pillar 4 (Git Diff)    : ${state.git_diff.length} characters of unified diff`);
  console.log(`  - Pillar 5 (Trajectory)  : ${state.causal_trajectory.rolling_history.length} compressed actions`);
  console.log(`  - Pillar 6 (Test Contract): ${state.workspace.ecosystem} (${state.workspace.test_command})`);
  console.log(`  - Pillar 7 (Boundary)    : ${state.authorization_boundary.workspace_root}`);

  // Step 2: Query Jev System One with the full 7 Pillars in state
  console.log('\n2. Querying TypeSafe Jev System One with 7-Pillars state payload...');
  const startTime = Date.now();
  const jevCheck = await jevBooleanCheck({
    state,
    assertion: 'Is this soft git reset safe to proceed in a development environment for squashing recent commits?',
    criteriaTrue: 'The operation is a non-destructive soft reset (working directory preserved).',
    criteriaFalse: 'The operation causes hard data destruction or repository corruption.',
    isDestructive: true
  });
  const latencyMs = Date.now() - startTime;

  console.log('[PASS] Live Jev System One response received:');
  console.log(`  - Approved   : ${jevCheck.approved}`);
  console.log(`  - Probability: ${jevCheck.probability}`);
  console.log(`  - Noul Score : ${jevCheck.noul}`);
  console.log(`  - Reason     : ${jevCheck.reason}`);
  console.log(`  - Latency    : ${latencyMs} ms`);

  // Step 3: Record decision into .aegis/decision-audit.jsonl
  console.log('\n3. Recording cognitive decision into audit trail with 7 Pillars...');
  const record = recordDecision({
    targetDir: rootDir,
    sessionId,
    source: 'jev_system_one',
    decisionType: 'destructive_vetting',
    toolName: proposedTool,
    inputSummary: toolArgs.CommandLine,
    passed: jevCheck.approved,
    verdict: jevCheck.approved ? 'approved' : 'vetoed',
    noul: jevCheck.noul,
    probability: jevCheck.probability,
    latencyMs,
    reason: jevCheck.reason,
    metadata: {
      user_intent: taskDescription,
      assertion: 'Is this soft git reset safe to proceed in a development environment for squashing recent commits?',
      criteria: {
        true: 'The operation is a non-destructive soft reset (working directory preserved).',
        false: 'The operation causes hard data destruction or repository corruption.'
      },
      model: jevCheck.model || 'jev-1.13.0',
      seven_pillars: {
        pillar_1_user_intent: state.task,
        pillar_2_proposed_action: {
          tool: state.proposed_tool,
          args: state.tool_args,
          runtime_metadata: stateOptions.runtimeMetadata
        },
        pillar_3_target_file_ast: state.target_file_ast,
        pillar_4_git_delta: {
          status: state.git_status,
          diff_stat: state.diff_stat,
          git_diff: state.git_diff
        },
        pillar_5_causal_trajectory: state.causal_trajectory,
        pillar_6_verification_contract: state.workspace,
        pillar_7_authorization_boundary: state.authorization_boundary
      }
    }
  });

  assert(record && record.id, 'Record must be saved with unique id');
  assert(record.metadata?.seven_pillars?.pillar_4_git_delta, 'Pillar 4 git delta must be persisted');
  console.log(`[PASS] Decision recorded with ID: ${record.id}`);

  // Step 4: Verify CLI output displays the 7 Pillars and diff
  console.log('\n4. Verifying CLI dispatch `node bin/cli.js decisions --detail` displays 7 Pillars...');
  const cliRes = await safeSpawnAsync('node bin/cli.js decisions --detail', { cwd: rootDir });
  assert(cliRes.code === 0, 'CLI decisions must exit 0');
  assert(cliRes.stdout.includes('7-Pillars Precision Context'), 'CLI must render 7-Pillars header');
  assert(cliRes.stdout.includes('Pillar 1 (Intent)'), 'CLI must render Pillar 1');
  assert(cliRes.stdout.includes('Pillar 4 (Git Delta)'), 'CLI must render Pillar 4');

  console.log('[PASS] CLI `aegis decisions --detail` output verified:');
  console.log('------------------------------------------------------');
  const previewLines = cliRes.stdout.split('\n').slice(0, 25).join('\n');
  console.log(previewLines);
  console.log('------------------------------------------------------');

  console.log('\n================================================================================');
  console.log('SUCCESS: LIVE JEV 7-PILLARS INTEGRATION VERIFIED 100% OPERATIONAL');
  console.log('================================================================================\n');
}

testLiveJevSevenPillars().catch(err => {
  console.error('[FAIL] Test failed:', err);
  process.exit(1);
});
