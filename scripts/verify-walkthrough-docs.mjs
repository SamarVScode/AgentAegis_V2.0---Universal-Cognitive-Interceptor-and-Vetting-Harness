import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const codebaseFiles = [
  'harness/acceptance-gate.js',
  'harness/core-laws-linter.js',
  'harness/cycle-detector.js',
  'harness/diff-variance.js',
  'harness/install.js',
  'harness/interceptor.js',
  'harness/jev-client.js',
  'harness/jev-vetter.js',
  'harness/manifest-sniffer.js',
  'harness/runner-parser.js',
  'harness/sensitive-guard.js',
  'harness/state-collector.js',
  'bin/cli.js',
  'index.js'
];

const fullCodebase = {};
for (const relPath of codebaseFiles) {
  const absPath = path.join(rootDir, relPath);
  const content = fs.readFileSync(absPath, 'utf8');
  fullCodebase[relPath] = content.length > 2500 ? content.slice(0, 2500) + '\n... [truncated]' : content;
}

const htmlContent = fs.readFileSync(path.join(rootDir, 'walkthrough', 'index.html'), 'utf8');
const appContent = fs.readFileSync(path.join(rootDir, 'walkthrough', 'app.js'), 'utf8');

async function verifyWalkthrough() {
  console.log('------------------------------------------------------------');
  console.log('Initiating Jev System One Verification for Walkthrough App');
  console.log('Passing full 14-file codebase context inside state object...');
  console.log('------------------------------------------------------------');

  const archSection = htmlContent.slice(htmlContent.indexOf('id="architecture"'), htmlContent.indexOf('id="benchmark"'));
  const benchmarkSection = htmlContent.slice(htmlContent.indexOf('id="benchmark"'), htmlContent.indexOf('id="physics"'));
  const terminalSection = htmlContent.slice(htmlContent.indexOf('id="terminal"'), htmlContent.indexOf('id="quickstart"'));
  const benchmarkData = appContent.slice(appContent.indexOf('const BENCHMARK_DATA'), appContent.indexOf('function initBenchmarkArena'));

  const res = await callJevSystemOne({
    state: {
      codebase_files_count: Object.keys(fullCodebase).length,
      codebase: fullCodebase,
      walkthrough_arch_html: archSection,
      walkthrough_benchmark_html: benchmarkSection,
      walkthrough_terminal_html: terminalSection,
      walkthrough_benchmark_data: benchmarkData
    },
    questions: {
      architecture_accuracy: {
        type: 'noul',
        instructions: 'Does the walkthrough accurately present the 4 cognitive interceptor stages (PreTool, Cycle Detector, State Collector, Acceptance Gate)?',
        criteria: { true: 'Presents 4 stages accurately', false: 'Does not present 4 stages accurately' }
      },
      benchmark_alignment: {
        type: 'noul',
        instructions: 'Does the walkthrough 3-way benchmark arena match the recorded numbers (2.32M Baseline vs 6.60M V1 vs 220k V2)?',
        criteria: { true: 'Benchmark telemetry matches exactly', false: 'Benchmark telemetry diverges' }
      },
      zero_emojis: {
        type: 'noul',
        instructions: 'Are the walkthrough HTML and JS assets strictly free of unicode emojis?',
        criteria: { true: 'Zero emojis present', false: 'Emojis present' }
      }
    },
    timeoutMs: 45000
  });

  console.log('Jev System One Walkthrough Evaluation Result:', JSON.stringify(res.answers, null, 2));

  const answers = res.answers || {};
  const scores = [
    answers.architecture_accuracy?.noul ?? 0,
    answers.benchmark_alignment?.noul ?? 0,
    answers.zero_emojis?.noul ?? 0
  ];

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  console.log(`Aggregate Walkthrough Jev Score: ${(avgScore * 100).toFixed(1)}% (Individual scores: ${scores.map(s => (s * 100).toFixed(1) + '%').join(', ')})`);

  if (avgScore >= 0.75) {
    console.log(`[PASS] Jev approved walkthrough app with score ${avgScore.toFixed(3)} >= 0.75`);
  } else {
    console.error(`[REJECTED] Jev score ${avgScore.toFixed(3)} below threshold 0.75`);
    process.exit(1);
  }
}

verifyWalkthrough().catch(err => {
  console.error('Walkthrough verification error:', err);
  process.exit(1);
});
