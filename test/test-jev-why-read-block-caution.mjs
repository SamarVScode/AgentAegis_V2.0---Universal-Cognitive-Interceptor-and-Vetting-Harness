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
  fullCodebase[f] = fs.readFileSync(path.join(rootDir, f), 'utf8');
}

try {
  const response = await callJevSystemOne({
    state: { complete_harness_source_code: fullCodebase },
    questions: {
      why_caution_on_read_cache: {
        type: 'choice',
        instructions: 'Why was blocking/caching view_file in interceptor marked with caution/not recommended?',
        criteria: {
          context_window_amnesia: 'Context amnesia: In long multi-turn sessions (>30 turns), earlier tool outputs scroll out of active attention or get compacted by LLM providers. If the harness blocks a re-read, the agent cannot access the file contents and hallucinates or crashes.',
          hash_collisions: 'SHA-256 has collisions.',
          performance_lag: 'Calculating sha256 is too slow.'
        }
      },
      safe_sha256_application: {
        type: 'choice',
        instructions: 'Where IS SHA-256 safely and effectively used without breaking agent memory?',
        criteria: {
          state_collector_and_shadow_diffing: 'In state-collector.js for compressing past tool history into sha256 digests (preventing envelope bloat) and in cycle-detector.js for tracking diff variance hashes at 0 tokens, without actively denying agents the ability to read code.',
          do_not_use_anywhere: 'Do not use SHA-256 anywhere.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('JEV CAUTION ANALYSIS:');
  console.log(JSON.stringify(response, null, 2));
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
