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

console.log('Reading full codebase of harness...');
const codebase = {};
let totalBytes = 0;
for (const f of files) {
  const fullPath = path.join(rootDir, f);
  const content = fs.readFileSync(fullPath, 'utf8');
  codebase[f] = content;
  totalBytes += content.length;
}

console.log(`Loaded ${files.length} files (${totalBytes} bytes). Submitting entire code to Jev System One...`);

try {
  const response = await callJevSystemOne({
    state: {
      complete_harness_source_code: codebase
    },
    questions: {
      code_review: {
        type: 'score',
        instructions: 'Evaluate the complete, unabridged source code of the TypeSafe Aegis harness across all modules. Score overall production readiness, code quality, token conservation architecture, and adversarial robustness on a 0-3 scale.',
        criteria: [
          'Unusable/Buggy: Severe vulnerabilities or broken implementations in source code',
          'Fragile: Core logic functions but contains notable architectural flaws or security leaks',
          'Production-Ready: Robust, clean architecture, zero external dependencies, solid security gates',
          'Exceptional: Enterprise-grade code quality, flawless multi-pattern loop prevention, robust Lie Detector, and complete zero-token fastpaths'
        ]
      },
      token_savings: {
        type: 'choice',
        instructions: 'Based on the actual source code logic (cycle detector Levenshtein diff variance, 0-token local regex fastpaths, and acceptance gate verification), does this harness save tokens in agentic coding workflows?',
        criteria: {
          high_savings: 'The code deterministically cuts off 50k-250k token thrashing loops and uses 0-token local checks for all non-destructive operations.',
          negligible_savings: 'The overhead cancels out any savings.',
          wasteful: 'The code causes more token consumption.'
        }
      }
    },
    timeoutMs: 45000
  });

  console.log('\n================================================================================');
  console.log('JEV SYSTEM ONE EVALUATION ON COMPLETE SOURCE CODE:');
  console.log(JSON.stringify(response, null, 2));
  console.log('================================================================================');
} catch (err) {
  console.error('Error submitting full code to Jev:', err.message);
  if (err.stack) console.error(err.stack);
}
