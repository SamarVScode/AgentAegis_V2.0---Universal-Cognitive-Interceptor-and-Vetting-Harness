import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';
import { loadFullCodebase } from './step1-hardening-diagnosis.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const proposedDiffFix2 = `
Index: harness/manifest-sniffer.js
===================================================================
--- harness/manifest-sniffer.js
+++ harness/manifest-sniffer.js
@@ -14,8 +14,16 @@
 export function findWorkspaceRoot(startDir = process.cwd(), markers = []) {
   let current = path.resolve(startDir);
   const root = path.parse(current).root;
+  const visited = new Set();

   while (current !== root) {
+    let canonical = current;
+    try {
+      canonical = fs.realpathSync(current);
+    } catch {}
+    if (visited.has(canonical)) break;
+    visited.add(canonical);
+
     for (const marker of markers) {
       if (fs.existsSync(path.join(current, marker))) {
         return current;
@@ -35,7 +43,15 @@
 export function findMarkerUpward(startDir, markers = [], maxLevels = 3) {
   try {
     let current = path.resolve(startDir);
+    const visited = new Set();
     for (let i = 0; i <= maxLevels; i++) {
+      let canonical = current;
+      try {
+        canonical = fs.realpathSync(current);
+      } catch {}
+      if (visited.has(canonical)) break;
+      visited.add(canonical);
+
       for (const marker of markers) {
         if (fs.existsSync(path.join(current, marker))) return current;
       }
`;

async function vetFix2() {
  const { codebase, totalChars, fileCount } = loadFullCodebase();
  console.log(`Submitting Fix 2 to Jev System One with full codebase context (${fileCount} files, ${totalChars} characters)...`);

  const response = await callJevSystemOne({
    state: {
      codebase_context: codebase,
      target_file: 'harness/manifest-sniffer.js',
      proposed_diff: proposedDiffFix2,
      intent: 'Harden findWorkspaceRoot and findMarkerUpward in harness/manifest-sniffer.js with visited Set and realpathSync to prevent infinite loops from cyclic directory symlinks.'
    },
    questions: {
      fix2_approval: {
        type: 'noul',
        instructions: 'Is the proposed diff for harness/manifest-sniffer.js correct, safe, production-ready, and compliant with zero-defect requirements?',
        criteria: {
          true: 'Approved: The fix safely breaks cyclic symlink loops using realpathSync and visited Set, preserves normal directory traversal, and handles file system errors gracefully.',
          false: 'Rejected: The diff is flawed, unsafe, or introduces regressions.'
        }
      },
      fix2_verdict: {
        type: 'choice',
        instructions: 'Select the verdict for this hardening change.',
        criteria: {
          approved: 'Approved for immediate production merge.',
          requires_revision: 'Requires revision.',
          reject: 'Rejected.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('Jev System One Response for Fix 2:');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'fix2-vetting-response.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
}

vetFix2().catch(err => {
  console.error('Vetting Fix 2 failed:', err.message);
  process.exit(1);
});
