import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const trackerFiles = [
  'harness/decision-tracker.js',
  'harness/interceptor.js',
  'bin/cli.js',
  'index.js',
  'test/test-decision-tracker.js'
];

console.log('Loading decision tracker codebase into Jev context...');
const codebaseContext = {};
for (const f of trackerFiles) {
  const fullPath = path.join(rootDir, f);
  if (fs.existsSync(fullPath)) {
    codebaseContext[f] = fs.readFileSync(fullPath, 'utf8');
  }
}

const questions = {
  tracker_implementation_integrity: {
    type: 'noul',
    instructions: 'Is the decision tracker properly, safely, and cleanly integrated into the AgentAegis harness (fail-safe JSON Lines append, non-blocking error handling, comprehensive lifecycle coverage in PreToolUse/PostToolUse/VerifyGate, clean CLI dispatch in bin/cli.js, export in index.js, and deterministic test coverage in test-decision-tracker.js)?',
    criteria: {
      true: 'The decision tracker is correctly implemented, fail-safe, non-blocking, integrated across all lifecycle hooks, and covered by automated tests.',
      false: 'There are design defects, unhandled exceptions that could block agent tool execution, or missing integrations.'
    }
  },
  zero_overhead_on_failure: {
    type: 'noul',
    instructions: 'Does the decision tracker guarantee that any filesystem error or serialization issue during audit logging will fail silently without crashing the interceptor or interrupting agent execution?',
    criteria: {
      true: 'recordDecision is wrapped in fail-safe try/catch blocks and returns null on failure without throwing.',
      false: 'An audit logging failure can throw an unhandled exception and crash the interceptor.'
    }
  },
  tracker_production_quality_score: {
    type: 'score',
    instructions: 'Rate the technical architecture, observability value, and production readiness of the decision tracker on a 0.00 to 3.00 scale.',
    criteria: [
      '0: Buggy or blocking implementation',
      '1: Basic logging with missing lifecycle metadata',
      '2: Robust, production-grade append-only telemetry with CLI query support and statistical aggregation',
      '3: Flawless enterprise observability pipeline'
    ]
  }
};

async function verifyTrackerWithJev() {
  console.log('======================================================');
  console.log('QUERYING JEV SYSTEM ONE TO VERIFY DECISION TRACKER');
  console.log('======================================================\n');

  try {
    const res = await callJevSystemOne({
      state: {
        assessment: 'decision_tracker_integration_verification',
        codebase: codebaseContext
      },
      questions,
      timeoutMs: 60000
    });

    const answers = res.answers || res.questions || res;
    console.log('--- JEV SYSTEM ONE DECISION TRACKER VERDICTS ---');
    console.log(JSON.stringify(answers, null, 2));

    const outPath = path.join(rootDir, 'test', 'jev-tracker-verdict.json');
    fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), answers }, null, 2), 'utf8');
    console.log(`\nVerdict saved to: ${outPath}`);
  } catch (err) {
    console.error('Jev verification error:', err.message);
    process.exit(1);
  }
}

verifyTrackerWithJev();
