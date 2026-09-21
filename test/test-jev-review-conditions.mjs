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
      conditional_recommend_reason: {
        type: 'choice',
        instructions: 'Why was deployment recommended conditionally rather than unconditionally?',
        criteria: {
          prerequisite_keys_and_test_suite: 'Prerequisites: The harness strictly requires a valid TYPESAFE_API_KEY and a functioning project test suite (e.g. npm test) to satisfy the Acceptance Gate; without them, the harness operates in fallback mode.',
          architecture_defect: 'Architecture Defect: There is a flaw in the code.',
          platform_unsupported: 'Platform Unsupported: The platform is not supported.'
        }
      },
      recommended_developer_action: {
        type: 'choice',
        instructions: 'What is the developer action to satisfy all conditions for production use?',
        criteria: {
          configure_env_and_tests: 'Configure Environment: Ensure TYPESAFE_API_KEY is configured in .env and an automated test suite exists in package.json/pytest/cargo so the Lie Detector and Acceptance Gate can verify builds.',
          rewrite_harness: 'Rewrite the harness from scratch.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('JEV CONDITIONS ANALYSIS:');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'jev-conditions-analysis.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
