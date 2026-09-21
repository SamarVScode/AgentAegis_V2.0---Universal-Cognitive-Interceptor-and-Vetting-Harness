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
      weakest_component: {
        type: 'choice',
        instructions: 'Looking at the actual code across all 10 files, which module has the most significant remaining architectural vulnerability, edge case, or fragility?',
        criteria: {
          interceptor_stdin_handling: 'interceptor.js stdin buffering, timeout, or engine argument parsing edge cases',
          acceptance_gate_execution: 'acceptance-gate.js subprocess execution, timeout, or claim regex fragility',
          cycle_detector_state: 'cycle-detector.js session serialization, shadow buffer concurrency, or diff variance math',
          sensitive_guard_regex: 'sensitive-guard.js path traversal regex gaps or false-positive/negative patterns',
          runner_parser_regex: 'runner-parser.js test runner output parsing heuristics across different ecosystems',
          manifest_sniffer_heuristics: 'manifest-sniffer.js upward directory walking and hybrid workspace detection'
        }
      },
      how_to_reach_score_3: {
        type: 'choice',
        instructions: 'What is the single most impactful architectural improvement needed to bring this codebase to score 3.0 (Exceptional / Enterprise-grade)?',
        criteria: {
          harden_subprocess_isolation: 'Harden subprocess execution with strict resource limits and sanitization in acceptance-gate and interceptor.',
          add_concurrency_file_locking: 'Add proper atomic file locking on session.json to prevent concurrent agent race conditions in cycle-detector.',
          expand_runner_ecosystems: 'Expand test runner parsers to cover more edge cases and multi-reporter outputs in runner-parser.',
          harden_stdin_streaming: 'Replace timeout-based stdin reading with chunk-based event stream parsing in interceptor.'
        }
      }
    },
    timeoutMs: 45000
  });

  console.log('JEV CODE DIAGNOSIS:');
  console.log(JSON.stringify(response, null, 2));
} catch (err) {
  console.error('Error:', err.message);
}
