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
let totalChars = 0;
for (const f of allFiles) {
  const content = fs.readFileSync(path.join(rootDir, f), 'utf8');
  fullCodebase[f] = content;
  totalChars += content.length;
}

console.log(`Loaded complete codebase context: ${allFiles.length} files, ${totalChars} characters.`);

try {
  const response = await callJevSystemOne({
    state: {
      repository: 'typesafe-aegis',
      version: '2.0.0',
      source_files: fullCodebase
    },
    questions: {
      production_readiness: {
        type: 'choice',
        instructions: 'Production readiness and engineering quality of TypeSafe Aegis based on complete source code.',
        criteria: {
          production_ready_exceptional: 'Production Ready: Modular architecture, deterministic test gate, cycle detector with diff variance and supervisor throttling, adaptive envelopes with SHA-256 history hashing, and zero-config installer.',
          prototype_needs_work: 'Prototype: Needs substantial rework.',
          flawed_unsafe: 'Flawed: Critical design defects.'
        }
      },
      architecture_cohesion: {
        type: 'choice',
        instructions: 'Architectural cohesion across interceptor, cycle detector, gate, and installer.',
        criteria: {
          seamless_cohesive: 'Seamless & Cohesive: Clean lifecycle integration, unified exit codes (0 benign, 2 veto), polymorphic parsing, and shared session state.',
          fragmented: 'Fragmented: Disjointed components.'
        }
      },
      token_efficiency: {
        type: 'choice',
        instructions: 'Effectiveness of token optimization and context protection architecture.',
        criteria: {
          effectively_mitigated: 'Effectively Mitigated: Universal Research Sandboxing, Focal Chunking, Supervisor Throttle, and SHA-256 history hashing protect against token compounding.',
          unmitigated_waste: 'Unmitigated: Token waste persists.'
        }
      },
      security_posture: {
        type: 'choice',
        instructions: 'Security posture, destructive command detection, and failure modes.',
        criteria: {
          hardened_and_safe: 'Hardened & Safe: Dual-layer fail-closed on destructive commands, encoded execution inspection, secret masking, and realpath symlink protection.',
          vulnerable: 'Vulnerable: Unsafe defaults or security bypasses.'
        }
      },
      deployment_verdict: {
        type: 'choice',
        instructions: 'Final deployment recommendation across Claude Code, Cursor, and Antigravity.',
        criteria: {
          unconditional_recommend: 'Unconditional Recommend: Standard cognitive interceptor for autonomous coding agents ensuring zero thrashing, zero hallucinations, and bounded tokens.',
          conditional_recommend: 'Conditional Recommend.',
          do_not_deploy: 'Do not deploy.'
        }
      }
    },
    timeoutMs: 90000
  });

  console.log('\n================================================================================');
  console.log('JEV SYSTEM ONE FULL HARNESS REVIEW VERDICT:');
  console.log('================================================================================\n');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'jev-full-harness-review.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
  console.log('\nVerdict persisted to test/jev-full-harness-review.json');
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
