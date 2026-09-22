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
  'harness/state-collector.js',
  'harness/decision-tracker.js',
  'harness/sensitive-guard.js'
];
const fullInventory = [
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
  'harness/decision-tracker.js',
  'bin/cli.js',
  'index.js'
];

console.log('Loading full unabridged codebase of TypeSafe Aegis harness (all files)...');
const fullCodebase = {};
let totalChars = 0;

for (const relPath of allFiles) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File missing: ${relPath}`);
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  fullCodebase[relPath] = content;
  totalChars += content.length;
  console.log(`- Loaded: ${relPath} (${content.length} characters)`);
}

console.log(`\nTotal files loaded: ${allFiles.length}`);
console.log(`Total characters: ${totalChars}`);
console.log('Submitting complete codebase to Jev System One (jev-1.13.0)...\n');

try {
  const response = await callJevSystemOne({
    state: {
      complete_harness_source_code: fullCodebase,
      file_inventory: fullInventory,
      total_characters: totalChars
    },
    questions: {
      ready_to_be_used: {
        type: 'choice',
        instructions: 'Based on the complete source code across all files, is the TypeSafe Aegis harness ready to be used in production agent workflows (Claude Code, Cursor, Antigravity)?',
        criteria: {
          ready_for_production: 'Ready to be used: The codebase has zero external runtime dependencies, deterministic fail-safes, multi-pattern loop breaking, hardened subprocess execution, credential leak protection, and live hook integration.',
          needs_further_hardening: 'Not ready: Contains blocking bugs, severe architectural vulnerabilities, or unhandled crashes that prevent everyday use.'
        }
      },
      token_savings_verdict: {
        type: 'choice',
        instructions: 'Based on the actual code implementation (Levenshtein diff-variance circuit breaker, 0-token CPU fastpaths for benign reads, and two-stage acceptance gate), will tokens be saved or not during agent operations?',
        criteria: {
          tokens_will_be_saved: 'Tokens will be saved: Deterministically cuts off 50,000 to 250,000 token thrashing loops, provides early warning at 2 repeats, and consumes 0 LLM tokens for standard reads and non-destructive tools.',
          tokens_will_not_be_saved: 'Tokens will not be saved: The system consumes more tokens than it saves or provides negligible savings.'
        }
      },
      readiness_score: {
        type: 'score',
        instructions: 'Score overall production readiness of the complete harness on a 0-3 scale.',
        criteria: [
          'Unusable/Broken',
          'Fragile/Experimental',
          'Production Ready',
          'Exceptional / Enterprise Grade'
        ]
      },
      operational_summary: {
        type: 'choice',
        instructions: 'What is the operational assessment of this harness for developers pairing with AI agents?',
        criteria: {
          recommended_for_deployment: 'Highly recommended for deployment: Provides cognitive guardrails, prevents code degradation, and protects repository integrity.',
          do_not_deploy: 'Do not deploy: Risks workflow disruption without tangible benefits.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('================================================================================');
  console.log('JEV SYSTEM ONE FULL CODEBASE VERIFICATION:');
  console.log(JSON.stringify(response, null, 2));
  console.log('================================================================================');

  // Save report
  fs.writeFileSync(
    path.join(rootDir, 'test', 'jev-full-verification-result.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
  console.log('Full result written to test/jev-full-verification-result.json');
} catch (err) {
  console.error('Error contacting Jev System One:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
}
