import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const allFiles = [
  'harness/interceptor.js',
  'harness/acceptance-gate.js',
  'harness/cycle-detector.js',
  'harness/sensitive-guard.js',
  'harness/diff-variance.js',
  'harness/runner-parser.js',
  'harness/manifest-sniffer.js',
  'harness/jev-client.js',
  'harness/install.js',
  'harness/state-collector.js',
  'harness/core-laws-linter.js',
  'harness/jev-vetter.js',
  'bin/cli.js',
  'index.js'
];

const fullCodebase = {};
for (const f of allFiles) {
  const raw = fs.readFileSync(path.join(rootDir, f), 'utf8');
  const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/^\s*[\r\n]/gm, '');
  fullCodebase[f] = cleaned;
}

const res = await callJevSystemOne({
  state: {
    codebase: fullCodebase,
    question_context: 'Patch 1 bundled two separate concerns: (1) fail-closed on uncaught errors in interceptor.js, and (2) appending parent process ID to fallback sessionId. We want to know the best clean implementation for both.'
  },
  questions: {
    design_issue_1: {
      type: 'choice',
      instructions: 'For Issue 1 (uncaught error handling), what is the proper fail-safe implementation?',
      criteria: {
        isolated_destructive_guard: 'Wrap the destructive evaluation (Step 4) in its own dedicated try/catch with hard exit 2, while top-level runner catches generic errors and exits 0 only if no destructive markers exist.',
        always_exit_2_on_error: 'Always exit 2 on any uncaught error in interceptor.',
        always_exit_0_on_error: 'Keep unconditional exit 0.'
      }
    },
    design_issue_6: {
      type: 'choice',
      instructions: 'For Issue 6 (session key fallback for concurrent agents), what is the proper implementation?',
      criteria: {
        use_ppid_or_pid: 'Derive fallback sessionId as cwd-${cwdHash}-${process.ppid || process.pid} so concurrent agent processes in the same working directory do not collide.',
        use_timestamp: 'Derive fallback sessionId with Date.now().',
        keep_cwd_hash_only: 'Keep cwd-${cwdHash} only.'
      }
    }
  }
});

console.log('Jev Diagnosis for Patch 1 & 6:');
console.log(JSON.stringify(res.answers, null, 2));
