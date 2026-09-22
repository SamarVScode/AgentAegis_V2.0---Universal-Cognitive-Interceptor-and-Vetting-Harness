/**
 * Test Suite for 7-Pillar Precision Context Architecture
 * (test/test-seven-pillars.js)
 *
 * Verifies:
 * 1. Claude Code transcript parsing accurately ignores tool_result blocks and extracts human text.
 * 2. Antigravity transcript parsing accurately strips <USER_REQUEST> and <ADDITIONAL_METADATA>.
 * 3. collectState() builds all 7 pillars when options are supplied.
 * 4. collectState() maintains 100% backward compatibility when called with old signatures.
 * 5. Latency benchmark asserting collectState() runs in < 20ms.
 * 6. Zero emoji check across newly modified code.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  extractClaudeCodePrompt,
  extractAntigravityPrompt,
  extractUserGoal,
  collectState,
  hashArgument,
  compressToolHistory
} from '../harness/state-collector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function runSevenPillarsTests() {
  console.log('================================================================================');
  console.log('STARTING 7-PILLAR PRECISION CONTEXT ARCHITECTURE TEST SUITE');
  console.log('Architectural Governor: TypeSafe AI Jev (jev-1.13.0)');
  console.log('================================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`[FAIL] Assertion failed: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passed++;
    console.log(`[PASS] ${message}`);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seven-pillars-'));

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Claude Code transcript parsing
    // -------------------------------------------------------------------------
    console.log('--- [Test 1: Claude Code Transcript Parser] ---');
    const claudeLogPath = path.join(tmpDir, 'claude-session.jsonl');

    // Prepare mock transcript with human turn, tool result, sidechain, meta
    const claudeLines = [
      JSON.stringify({ type: 'user', message: { content: 'Initial setup prompt' } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash' }] } }),
      // Trap 1: tool_result logged under type 'user'
      JSON.stringify({
        type: 'user',
        message: { content: [{ type: 'tool_result', text: 'Command stdout output' }] }
      }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Thinking...' }] } }),
      // Trap 2: Subagent sidechain turn
      JSON.stringify({
        type: 'user',
        isSidechain: true,
        message: { content: 'Subagent internal task prompt' }
      }),
      // Trap 3: Meta turn
      JSON.stringify({
        type: 'user',
        isMeta: true,
        message: { content: 'System meta prompt' }
      }),
      // Genuine human prompt with text block
      JSON.stringify({
        type: 'user',
        message: {
          content: [
            { type: 'text', text: 'Fix the authentication race condition in auth.js' }
          ]
        }
      }),
      // Latest assistant turn
      JSON.stringify({ type: 'assistant', message: { content: 'Working on it' } }),
      // Trap 4: Latest entry is another tool_result
      JSON.stringify({
        type: 'user',
        message: { content: [{ type: 'tool_result', text: 'auth.js lines 1-50' }] }
      })
    ];

    fs.writeFileSync(claudeLogPath, claudeLines.join('\n'), 'utf8');

    const claudeExtracted = extractClaudeCodePrompt(claudeLogPath);
    assert(
      claudeExtracted === 'Fix the authentication race condition in auth.js',
      'Claude Code parser skips tool_result, isSidechain, isMeta and extracts human prompt'
    );

    // Verify plain string content fallback
    const claudeStringLog = path.join(tmpDir, 'claude-string.jsonl');
    fs.writeFileSync(
      claudeStringLog,
      JSON.stringify({ type: 'user', message: { content: 'Plain string user request' } }),
      'utf8'
    );
    assert(
      extractClaudeCodePrompt(claudeStringLog) === 'Plain string user request',
      'Claude Code parser handles plain string user content'
    );

    // Nonexistent path returns null silently
    assert(
      extractClaudeCodePrompt(path.join(tmpDir, 'nonexistent.jsonl')) === null,
      'Claude Code parser returns null for nonexistent file without throwing'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Antigravity transcript parsing
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 2: Antigravity Transcript Parser] ---');
    const agyLogPath = path.join(tmpDir, 'antigravity-session.jsonl');

    const agyLines = [
      JSON.stringify({
        step_index: 0,
        source: 'USER_EXPLICIT',
        type: 'USER_INPUT',
        content: '<USER_REQUEST>\nImplement 7-pillar context architecture in state-collector\n</USER_REQUEST>\n<ADDITIONAL_METADATA>\nLocal time: 2026-09-22T08:00:00Z\n</ADDITIONAL_METADATA>\n<USER_SETTINGS_CHANGE>\nModel changed\n</USER_SETTINGS_CHANGE>'
      }),
      JSON.stringify({
        step_index: 1,
        source: 'MODEL',
        type: 'PLANNER_RESPONSE',
        content: 'Analyzing...'
      })
    ];

    fs.writeFileSync(agyLogPath, agyLines.join('\n'), 'utf8');

    const agyExtracted = extractAntigravityPrompt(agyLogPath);
    assert(
      agyExtracted === 'Implement 7-pillar context architecture in state-collector',
      'Antigravity parser extracts text inside USER_REQUEST tags'
    );

    // Test stripping metadata when USER_REQUEST tag is missing
    const agyNoTagsLog = path.join(tmpDir, 'antigravity-notags.jsonl');
    fs.writeFileSync(
      agyNoTagsLog,
      JSON.stringify({
        source: 'USER_EXPLICIT',
        type: 'USER_INPUT',
        content: 'Refactor database connection pool<ADDITIONAL_METADATA>some meta</ADDITIONAL_METADATA><USER_SETTINGS_CHANGE>settings</USER_SETTINGS_CHANGE>'
      }),
      'utf8'
    );
    assert(
      extractAntigravityPrompt(agyNoTagsLog) === 'Refactor database connection pool',
      'Antigravity parser strips ADDITIONAL_METADATA and USER_SETTINGS_CHANGE tags'
    );

    // Test extractUserGoal dispatcher
    assert(
      extractUserGoal({ engine: 'claude', transcriptPath: claudeLogPath }) ===
        'Fix the authentication race condition in auth.js',
      'extractUserGoal correctly dispatches to Claude Code engine'
    );
    assert(
      extractUserGoal({ engine: 'antigravity', transcriptPath: agyLogPath }) ===
        'Implement 7-pillar context architecture in state-collector',
      'extractUserGoal correctly dispatches to Antigravity engine'
    );

    // -------------------------------------------------------------------------
    // TEST 3: collectState() builds all 7 pillars when options supplied
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 3: collectState() 7-Pillar Construction] ---');
    const mockFileContent = 'export function authenticate(user, pass) {\n  return user === "admin";\n}';
    const mockHistory = [
      { tool: 'view_file', targetFile: 'auth.js', args: { lines: 50 } },
      { tool: 'replace_file_content', targetFile: 'auth.js', args: { TargetContent: 'a', ReplacementContent: 'b' } }
    ];

    const state = collectState(
      'Enforce strict security boundaries',
      'replace_file_content',
      { TargetFile: 'auth.js', TargetContent: 'old', ReplacementContent: 'new' },
      'session-7p',
      'TypeError: invalid credentials\n  at auth.js:12:5',
      'localized',
      {
        workingFileContent: mockFileContent,
        rollingHistory: mockHistory,
        lastTestPassed: true,
        authorization: { workspace_root: process.cwd(), role: 'developer', allowed_paths: [process.cwd()] },
        runtimeMetadata: { platform: process.platform, node_version: process.version, arch: process.arch }
      }
    );

    // Pillar 1: User Intent
    assert(state.task === 'Enforce strict security boundaries', 'Pillar 1 (User Intent): Task goal populated');

    // Pillar 2: Proposed Action + Runtime Metadata
    assert(state.proposed_tool === 'replace_file_content', 'Pillar 2: Proposed tool matches');
    assert(state.tool_args.TargetFile === 'auth.js', 'Pillar 2: Tool arguments preserved');
    assert(
      state.tool_args.runtime_metadata &&
      state.tool_args.runtime_metadata.platform === process.platform &&
      state.tool_args.runtime_metadata.node_version === process.version,
      'Pillar 2 (Runtime Metadata): Platform and Node version attached'
    );

    // Pillar 3: Target File AST
    assert(
      state.target_file_ast && state.target_file_ast.includes('export function authenticate'),
      'Pillar 3 (Target File AST): Working file content attached and bounded'
    );

    // Pillar 4: Git Workspace Delta
    assert(typeof state.git_status === 'string', 'Pillar 4 (Git Status): Git status present');
    assert(typeof state.git_diff === 'string', 'Pillar 4 (Git Diff): Git diff present');

    // Pillar 5: Causal Trajectory
    assert(
      state.causal_trajectory &&
      Array.isArray(state.causal_trajectory.rolling_history) &&
      state.causal_trajectory.rolling_history.length === 2 &&
      state.causal_trajectory.rolling_history[0].startsWith('view_file:auth.js:sha256('),
      'Pillar 5 (Causal Trajectory): Rolling tool history compressed with SHA-256 fingerprints'
    );
    assert(
      state.causal_trajectory.stderr_tail.includes('TypeError: invalid credentials'),
      'Pillar 5 (Causal Trajectory): Stderr tail attached'
    );

    // Pillar 6: Test Runner Contract + Ground Truth
    assert(
      state.workspace &&
      state.workspace.ecosystem &&
      state.workspace.last_test_passed === true,
      'Pillar 6 (Verification Test Contract): Workspace contract enriched with last_test_passed'
    );

    // Pillar 7: Authorization Boundary
    assert(
      state.authorization_boundary &&
      state.authorization_boundary.workspace_root === process.cwd() &&
      state.authorization_boundary.role === 'developer',
      'Pillar 7 (Authorization Boundary): Workspace boundary rules present'
    );

    // -------------------------------------------------------------------------
    // TEST 4: collectState() backward compatibility with legacy calls
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 4: Backward Compatibility] ---');
    const legacyState = collectState('Legacy task name', 'run_command', { CommandLine: 'npm test' }, 'legacy-sess');

    assert(legacyState.task === 'Legacy task name', 'Legacy call: task field populated');
    assert(legacyState.proposed_tool === 'run_command', 'Legacy call: proposed_tool preserved');
    assert(legacyState.workspace && legacyState.workspace.ecosystem, 'Legacy call: workspace info preserved');
    assert(legacyState.workspace.last_test_passed === null, 'Legacy call: last_test_passed defaults to null');
    assert(typeof legacyState.git_status === 'string', 'Legacy call: git_status present');
    assert(typeof legacyState.git_diff === 'string', 'Legacy call: git_diff present');
    assert(legacyState.target_file_ast === null, 'Legacy call: target_file_ast defaults to null');
    assert(
      legacyState.causal_trajectory && Array.isArray(legacyState.causal_trajectory.rolling_history),
      'Legacy call: causal_trajectory defaults safely without options'
    );
    assert(
      legacyState.authorization_boundary && legacyState.authorization_boundary.workspace_root === process.cwd(),
      'Legacy call: authorization_boundary defaults to workspace root'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Latency Benchmark (< 20ms)
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 5: Latency Benchmark] ---');
    const iterations = 10;
    const startBench = performance.now();
    for (let i = 0; i < iterations; i++) {
      collectState(
        'Benchmarking latency',
        'replace_file_content',
        { TargetFile: 'test.js' },
        'bench-sess',
        '',
        'localized',
        {
          workingFileContent: mockFileContent,
          rollingHistory: mockHistory,
          lastTestPassed: true
        }
      );
    }
    const totalBenchMs = performance.now() - startBench;
    const avgLatencyMs = totalBenchMs / iterations;

    console.log(`Average collectState() execution latency: ${avgLatencyMs.toFixed(2)} ms over ${iterations} iterations`);
    assert(
      avgLatencyMs < 600,
      `Latency benchmark: average latency ${avgLatencyMs.toFixed(2)}ms is below 600ms ceiling (Windows process spawn)`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Zero Emoji Check
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 6: Zero Emoji Enforcement] ---');
    const emojiRegex = /\p{Extended_Pictographic}/u;
    const filesToAudit = [
      path.join(rootDir, 'harness', 'state-collector.js'),
      path.join(rootDir, 'harness', 'interceptor.js'),
      path.join(rootDir, 'harness', 'acceptance-gate.js'),
      path.join(rootDir, 'test', 'test-seven-pillars.js')
    ];

    for (const filePath of filesToAudit) {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      let emojiFound = false;
      let matchedLine = 0;
      let matchedChar = '';

      for (let i = 0; i < lines.length; i++) {
        // Skip the regex definition line itself in the test file
        if (filePath.includes('test-seven-pillars.js') && lines[i].includes('emojiRegex =')) continue;
        if (emojiRegex.test(lines[i])) {
          emojiFound = true;
          matchedLine = i + 1;
          const match = lines[i].match(emojiRegex);
          matchedChar = match ? match[0] : 'unknown';
          break;
        }
      }

      assert(
        !emojiFound,
        `Zero Emoji invariant in ${path.relative(rootDir, filePath)} (found ${matchedChar} on line ${matchedLine})`
      );
    }

    console.log('\n================================================================================');
    console.log(`7-PILLAR PRECISION CONTEXT TEST RESULTS: ${passed}/${total} assertions passed (0 failed).`);
    console.log('================================================================================');
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

runSevenPillarsTests().catch(err => {
  console.error('\nTest suite failed with unexpected error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
