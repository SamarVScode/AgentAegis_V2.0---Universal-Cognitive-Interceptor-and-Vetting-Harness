import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export const ALL_14_FILES = [
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

export function loadFullCodebase(baseDir = rootDir) {
  const codebase = {};
  let totalChars = 0;
  for (const relPath of ALL_14_FILES) {
    const fullPath = path.join(baseDir, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    codebase[relPath] = content;
    totalChars += content.length;
  }
  return { codebase, totalChars, fileCount: ALL_14_FILES.length };
}

async function runDiagnosis() {
  const { codebase, totalChars, fileCount } = loadFullCodebase();
  console.log(`Loaded all ${fileCount} files into context (${totalChars} characters).`);

  const response = await callJevSystemOne({
    state: {
      codebase_context: codebase,
      total_characters: totalChars,
      file_count: fileCount,
      target_hardening_areas: [
        'harness/state-collector.js: git status / diff collection maxBuffer (10MB) and line limits for monorepos',
        'harness/manifest-sniffer.js: visited directory Set and realpath resolution against cyclic symlinks'
      ]
    },
    questions: {
      state_collector_diagnosis: {
        type: 'choice',
        instructions: 'Diagnose harness/state-collector.js: Does git status and git diff collection need maxBuffer: 10*1024*1024 (10MB) and line limits to prevent buffer overflow and memory spikes on large repositories?',
        criteria: {
          recommended: 'Yes, setting maxBuffer to 10MB and enforcing line truncation prevents RangeError buffer overflow and memory exhaustion on monorepos with >100k diff lines.',
          unnecessary: 'No, default 1MB buffer and current logic is sufficient.'
        }
      },
      manifest_sniffer_diagnosis: {
        type: 'choice',
        instructions: 'Diagnose harness/manifest-sniffer.js: Does directory traversal in findWorkspaceRoot and findMarkerUpward require a visited Set using realpathSync to prevent infinite loops from cyclic symlinks?',
        criteria: {
          recommended: 'Yes, tracking visited canonical paths with realpathSync protects against cyclic symlink loops when traversing directories.',
          unnecessary: 'No, simple path.dirname traversal without cyclic protection is safe.'
        }
      },
      overall_diagnosis_approval: {
        type: 'noul',
        instructions: 'Is implementing these two targeted hardening fixes in harness/state-collector.js and harness/manifest-sniffer.js recommended for enterprise-grade robustness and zero-defect production readiness?',
        criteria: {
          true: 'Approved: The proposed hardening fixes enhance reliability under edge cases without regressions or unnecessary bloat.',
          false: 'Rejected: The proposed changes are superfluous or introduce unwanted side effects.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('Jev System One Diagnosis Response:');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'hardening-diagnosis-response.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
}

runDiagnosis().catch(err => {
  console.error('Diagnosis failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
