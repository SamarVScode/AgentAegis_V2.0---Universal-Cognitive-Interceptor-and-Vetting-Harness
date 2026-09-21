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
      interceptor_score: {
        type: 'score',
        instructions: 'Score harness/interceptor.js quality and robustness (0=buggy, 1=fragile, 2=production, 3=exceptional)',
        criteria: ['Buggy', 'Fragile', 'Production', 'Exceptional']
      },
      acceptance_gate_score: {
        type: 'score',
        instructions: 'Score harness/acceptance-gate.js quality and robustness (0=buggy, 1=fragile, 2=production, 3=exceptional)',
        criteria: ['Buggy', 'Fragile', 'Production', 'Exceptional']
      },
      cycle_detector_score: {
        type: 'score',
        instructions: 'Score harness/cycle-detector.js quality and robustness (0=buggy, 1=fragile, 2=production, 3=exceptional)',
        criteria: ['Buggy', 'Fragile', 'Production', 'Exceptional']
      },
      sensitive_guard_score: {
        type: 'score',
        instructions: 'Score harness/sensitive-guard.js quality and robustness (0=buggy, 1=fragile, 2=production, 3=exceptional)',
        criteria: ['Buggy', 'Fragile', 'Production', 'Exceptional']
      },
      jev_client_score: {
        type: 'score',
        instructions: 'Score harness/jev-client.js quality and robustness (0=buggy, 1=fragile, 2=production, 3=exceptional)',
        criteria: ['Buggy', 'Fragile', 'Production', 'Exceptional']
      },
      runner_parser_score: {
        type: 'score',
        instructions: 'Score harness/runner-parser.js quality and robustness (0=buggy, 1=fragile, 2=production, 3=exceptional)',
        criteria: ['Buggy', 'Fragile', 'Production', 'Exceptional']
      }
    },
    timeoutMs: 45000
  });

  console.log('JEV PER-MODULE SCORES:');
  console.log(JSON.stringify(response, null, 2));
} catch (err) {
  console.error('Error:', err.message);
}
