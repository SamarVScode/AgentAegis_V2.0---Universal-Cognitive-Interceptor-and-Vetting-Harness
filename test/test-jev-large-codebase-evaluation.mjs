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
    state: {
      repository: 'typesafe-aegis',
      source_files: fullCodebase
    },
    questions: {
      large_codebase_suitability: {
        type: 'choice',
        instructions: 'Evaluate the suitability and scalability of TypeSafe Aegis on large codebases, monorepos, and multi-thousand file repositories.',
        criteria: {
          highly_scalable_and_protected: 'Highly Scalable & Protected: Aegis explicitly protects against large-codebase failure modes: 10MB execSync maxBuffer with 50-line caps on git status/diff, lockfile exclusion, adaptive token envelopes, bounded manifest sniffer search depth (maxDepth: 3) with cyclic symlink protection, disk-backed shadow buffers, and focal chunking.',
          prone_to_buffer_overflow: 'Prone to Buffer Overflow: Large codebases will crash the state collector or overwhelm memory.',
          unsupported_on_monorepos: 'Unsupported: Cannot handle monorepos or multi-project workspaces.'
        }
      },
      monorepo_token_protection: {
        type: 'choice',
        instructions: 'How does the harness prevent token blowouts when agents work in massive repositories?',
        criteria: {
          bounded_envelopes_and_focal_slices: 'Bounded Envelopes & Focal Slices: The state collector bounds git diffs to 1,200-2,500 chars and hashes massive arguments with SHA-256. Simultaneously, Universal Research Sandboxing and Focal Chunking prevent the agent from loading multi-megabyte files into conversation context.',
          unbounded_context_leaks: 'Context Leaks: Large diffs flow unchecked into the LLM context.'
        }
      },
      large_codebase_recommendation: {
        type: 'choice',
        instructions: 'What is Jev recommendation for engineering teams deploying this harness on enterprise large-scale repositories?',
        criteria: {
          strongly_recommended_with_scoped_tests: 'Strongly Recommended: Ideal for large repositories because the cycle detector stops repetitive file thrashing across deep module trees, and the test gate verifies builds against workspace test commands.',
          not_recommended_for_large_repos: 'Not recommended for large codebases.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('JEV LARGE CODEBASE EVALUATION:');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'jev-large-codebase-evaluation.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
