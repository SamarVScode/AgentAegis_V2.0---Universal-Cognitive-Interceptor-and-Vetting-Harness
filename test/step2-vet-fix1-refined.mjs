import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';
import { loadFullCodebase } from './step1-hardening-diagnosis.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const refinedDiffFix1 = `
Index: harness/state-collector.js
===================================================================
--- harness/state-collector.js
+++ harness/state-collector.js
@@ -102,23 +102,45 @@
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
     }).trim();
+    if (rawStatus) {
+      const statusLines = rawStatus.split('\\n').filter(Boolean);
+      if (statusLines.length > MAX_LINES) {
+        gitStatus = statusLines.slice(0, MAX_LINES).join('\\n') + \`\\n... [\${statusLines.length - MAX_LINES} more status lines truncated]\`;
+      } else {
+        gitStatus = rawStatus;
+      }
+    }

-    gitDiffStat = execSync('git diff --stat', {
+    const rawDiffStat = execSync('git diff --stat', {
       encoding: 'utf8',
       timeout: 2000,
+      maxBuffer: MAX_BUFFER,
       stdio: ['pipe', 'pipe', 'ignore']
     }).trim();
+    if (rawDiffStat) {
+      const diffStatLines = rawDiffStat.split('\\n').filter(Boolean);
+      if (diffStatLines.length > MAX_LINES) {
+        gitDiffStat = diffStatLines.slice(0, MAX_LINES).join('\\n') + \`\\n... [\${diffStatLines.length - MAX_LINES} more diff-stat lines truncated]\`;
+      } else {
+        gitDiffStat = rawDiffStat;
+      }
+    }

     // Exclude package lockfiles and capture top 40 lines
     gitDiffApp = execSync('git diff -U2 -- ":!package-lock.json" ":!yarn.lock" ":!pnpm-lock.yaml" ":!poetry.lock"', {
       encoding: 'utf8',
       timeout: 2000,
+      maxBuffer: MAX_BUFFER,
       stdio: ['pipe', 'pipe', 'ignore']
     })
@@ -148,3 +170,3 @@
-      const modifiedFilesCount = gitStatus.split('\\n').filter(Boolean).length;
+      const modifiedFilesCount = gitStatus.split('\\n').filter(l => Boolean(l) && !l.startsWith('...')).length;
       determinedScope = modifiedFilesCount > 1 ? 'multifile' : 'localized';
`;

async function vetRefinedFix1() {
  const { codebase, totalChars, fileCount } = loadFullCodebase();

  const response = await callJevSystemOne({
    state: {
      codebase_context: codebase,
      target_file: 'harness/state-collector.js',
      proposed_diff: refinedDiffFix1,
      intent: 'Harden harness/state-collector.js with 10MB maxBuffer, 50-line truncation limits, and accurate modifiedFilesCount accounting.'
    },
    questions: {
      refined_fix1_approval: {
        type: 'noul',
        instructions: 'Is this refined implementation for harness/state-collector.js approved for production deployment?',
        criteria: {
          true: 'Approved: The implementation adheres strictly to best practices, prevents buffer overflow, avoids memory exhaustion, preserves modifiedFilesCount accuracy, and is fully production-ready.',
          false: 'Rejected: Flaws or unintended consequences remain.'
        }
      },
      refined_fix1_verdict: {
        type: 'choice',
        instructions: 'Select the verdict for this refined change.',
        criteria: {
          approved: 'Approved for immediate production merge.',
          reject: 'Rejected.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('Jev System One Refined Fix 1 Response:');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'fix1-refined-response.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
}

vetRefinedFix1().catch(console.error);
