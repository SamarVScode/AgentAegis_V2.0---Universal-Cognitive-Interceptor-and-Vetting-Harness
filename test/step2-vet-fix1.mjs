import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';
import { loadFullCodebase } from './step1-hardening-diagnosis.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const proposedDiffFix1 = `
Index: harness/state-collector.js
===================================================================
--- harness/state-collector.js
+++ harness/state-collector.js
@@ -102,23 +102,39 @@
   let gitDiffStat = '';
   let gitDiffApp = '';
+  const MAX_BUFFER = 10 * 1024 * 1024;
+  const MAX_LINES = 50;

   try {
-    gitStatus = execSync('git status --porcelain', {
+    const rawStatus = execSync('git status --porcelain', {
       encoding: 'utf8',
       timeout: 2000,
+      maxBuffer: MAX_BUFFER,
       stdio: ['pipe', 'pipe', 'ignore']
-    }).trim();
+    });
+    const statusLines = rawStatus.split('\\n');
+    if (statusLines.length > MAX_LINES) {
+      gitStatus = statusLines.slice(0, MAX_LINES).join('\\n') + \`\\n... [\${statusLines.length - MAX_LINES} more status lines truncated]\`;
+    } else {
+      gitStatus = rawStatus.trim();
+    }

-    gitDiffStat = execSync('git diff --stat', {
+    const rawDiffStat = execSync('git diff --stat', {
       encoding: 'utf8',
       timeout: 2000,
+      maxBuffer: MAX_BUFFER,
       stdio: ['pipe', 'pipe', 'ignore']
-    }).trim();
+    });
+    const diffStatLines = rawDiffStat.split('\\n');
+    if (diffStatLines.length > MAX_LINES) {
+      gitDiffStat = diffStatLines.slice(0, MAX_LINES).join('\\n') + \`\\n... [\${diffStatLines.length - MAX_LINES} more diff-stat lines truncated]\`;
+    } else {
+      gitDiffStat = rawDiffStat.trim();
+    }

     // Exclude package lockfiles and capture top 40 lines
     gitDiffApp = execSync('git diff -U2 -- ":!package-lock.json" ":!yarn.lock" ":!pnpm-lock.yaml" ":!poetry.lock"', {
       encoding: 'utf8',
       timeout: 2000,
+      maxBuffer: MAX_BUFFER,
       stdio: ['pipe', 'pipe', 'ignore']
     })
`;

async function vetFix1() {
  const { codebase, totalChars, fileCount } = loadFullCodebase();
  console.log(`Submitting Fix 1 to Jev System One with full codebase context (${fileCount} files, ${totalChars} characters)...`);

  const response = await callJevSystemOne({
    state: {
      codebase_context: codebase,
      target_file: 'harness/state-collector.js',
      proposed_diff: proposedDiffFix1,
      intent: 'Harden git status and diff collection with 10MB maxBuffer and line truncation to prevent buffer overflow and memory spikes on large repositories.'
    },
    questions: {
      fix1_approval: {
        type: 'noul',
        instructions: 'Is the proposed diff for harness/state-collector.js correct, safe, production-ready, and compliant with zero-defect requirements?',
        criteria: {
          true: 'Approved: The fix safely prevents maxBuffer overflows, bounds line counts, maintains error resilience with try/catch, and introduces no regressions.',
          false: 'Rejected: The diff is flawed, unsafe, or breaks existing contract.'
        }
      },
      fix1_readiness_choice: {
        type: 'choice',
        instructions: 'Select the verdict for this hardening change.',
        criteria: {
          approved_for_production: 'The change is robust, elegant, backward-compatible, and approved for immediate merge.',
          requires_revision: 'The change requires structural modification before merging.',
          reject: 'The change is detrimental or unnecessary.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('Jev System One Response for Fix 1:');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'fix1-vetting-response.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
}

vetFix1().catch(err => {
  console.error('Vetting Fix 1 failed:', err.message);
  process.exit(1);
});
