import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const files = [
  'harness/interceptor.js',
  'harness/acceptance-gate.js',
  'harness/cycle-detector.js',
  'harness/sensitive-guard.js',
  'harness/diff-variance.js',
  'harness/runner-parser.js',
  'harness/manifest-sniffer.js',
  'harness/jev-client.js',
  'harness/install.js',
  'bin/cli.js'
];

const codebase = {};
for (const f of files) {
  codebase[f] = fs.readFileSync(path.join(rootDir, f), 'utf8');
}

try {
  const response = await callJevSystemOne({
    state: { complete_harness_source_code: codebase },
    questions: {
      acceptance_gate_hardening_spec: {
        type: 'choice',
        instructions: 'For hardening acceptance-gate.js subprocess execution, what specific enhancements are most vital?',
        criteria: {
          maxbuffer_and_kill_tree: 'Increase maxBuffer to 10MB, set windowsHide: true, add child process tree termination on timeout, and handle ERR_CHILD_PROCESS_STDIO_MAXBUFFER gracefully without crashing.',
          docker_containerization: 'Run test suite inside an ephemeral Docker container.',
          basic_try_catch_only: 'Only add a try/catch wrapper.'
        }
      },
      token_savings_enhancement: {
        type: 'choice',
        instructions: 'To maximize token savings during agent sessions, what should be added or tuned in the codebase?',
        criteria: {
          tighten_circuit_breaker: 'Tighten thrashing breaker: trigger critique warning at 2 repeats, hard veto at 3 repeats, and cache shadow diff hashes to prevent duplicate re-evaluations.',
          truncate_tool_args: 'Truncate all tool argument inputs to 500 characters indiscriminately.',
          no_change_needed: 'Current token savings architecture is already optimal.'
        }
      },
      code_quality_elevation: {
        type: 'choice',
        instructions: 'To maximize project code quality produced by agents, what should be added or tuned in the harness?',
        criteria: {
          multi_stage_acceptance: 'In acceptance-gate.js, require BOTH clean test exit code (0) AND parsed test count (>0 tests passed), and veto 0-test runs or 100% skipped suites to prevent false completions.',
          ban_all_eval_and_regex: 'Ban all dynamic regular expressions and eval across projects.',
          no_change_needed: 'Current code quality gating is sufficient.'
        }
      }
    },
    timeoutMs: 45000
  });

  console.log('JEV ARCHITECTURAL PRESCRIPTION:');
  console.log(JSON.stringify(response, null, 2));
} catch (err) {
  console.error('Error:', err.message);
}
