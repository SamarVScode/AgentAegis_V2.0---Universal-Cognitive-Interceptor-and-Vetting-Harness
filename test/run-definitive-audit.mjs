/**
 * Definitive Jev Governance Auditor (test/run-definitive-audit.mjs)
 * Executes holistic audit across all 11 Aegis harness modules.
 * Submits rich architectural context and PoC failure scenarios to TypeSafe AI Jev (jev-1.13.0).
 * Records rulings to test/final-definitive-audit-results.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const HARNESS_DIR = path.join(ROOT_DIR, 'harness');
const OUTPUT_FILE = path.join(__dirname, 'final-definitive-audit-results.json');

// Read source files
function readHarnessFile(filename) {
  return fs.readFileSync(path.join(HARNESS_DIR, filename), 'utf8');
}

const jevClientSrc = readHarnessFile('jev-client.js');
const jevVetterSrc = readHarnessFile('jev-vetter.js');
const sensitiveGuardSrc = readHarnessFile('sensitive-guard.js');
const manifestSnifferSrc = readHarnessFile('manifest-sniffer.js');
const coreLawsLinterSrc = readHarnessFile('core-laws-linter.js');
const runnerParserSrc = readHarnessFile('runner-parser.js');
const acceptanceGateSrc = readHarnessFile('acceptance-gate.js');
const cycleDetectorSrc = readHarnessFile('cycle-detector.js');
const diffVarianceSrc = readHarnessFile('diff-variance.js');
const interceptorSrc = readHarnessFile('interceptor.js');
const stateCollectorSrc = readHarnessFile('state-collector.js');

const CANDIDATES = [
  {
    id: 'ISSUE-01',
    title: 'Signature Mismatch in isDestructiveAction across jev-client.js and jev-vetter.js',
    targetModules: ['harness/jev-client.js', 'harness/jev-vetter.js', 'harness/interceptor.js'],
    exactLocations: 'harness/jev-client.js:26-91 vs harness/jev-vetter.js:33-99',
    codeSnippet: `// In harness/jev-client.js:
export function isDestructiveAction(toolName = '', toolArgs = {}) {
  const tool = (toolName || '').toLowerCase();
  const args = toolArgs || {}; ...
}

// In harness/jev-vetter.js:
export function isDestructiveAction(state) {
  if (!state) return false;
  const tool = (state.proposed_tool || '').toLowerCase();
  const args = state.tool_args || {}; ...
}`,
    failureScenario: `1. When isDestructiveAction is invoked with a state object on jev-client.js:
   isDestructiveAction(state) passes state as the first parameter 'toolName'.
   Calling (toolName || '').toLowerCase() throws TypeError: toolName.toLowerCase is not a function because toolName is an Object.
2. When isDestructiveAction is invoked with (toolName, toolArgs) on jev-vetter.js:
   toolName is received as 'state'. state.proposed_tool is undefined, state.tool_args is undefined.
   The function returns false for destructive operations (e.g. rm -rf, drop table, git reset), causing a silent fail-open security bypass.
3. interceptor.js imports isDestructiveAction from jev-client.js, while other callers and tests import from jev-vetter.js, creating inconsistent bipartite fail-safe behavior.`,
    intendedBehavior: `A unified, polymorphic function signature export function isDestructiveAction(toolNameOrState, toolArgs = {}) that safely inspects whether the first argument is an object (state with proposed_tool and tool_args) or a string (toolName with separate toolArgs), avoiding TypeErrors and preventing silent fail-open security bypasses.`,
    tradeOffsAndContext: `The two modules evolved independently: jev-vetter was written for MCP client state envelopes, while jev-client was written for direct CLI interceptor tool parsing. Both implementations contain identical regex logic, but their incompatible parameter signatures create a severe integration hazard.`,
    proposedRemediation: `Refactor isDestructiveAction in both modules (or unify into jev-client.js and re-export in jev-vetter.js) to accept polymorphic arguments:
if (typeof toolNameOrState === 'object' && toolNameOrState !== null) {
  tool = (toolNameOrState.proposed_tool || toolNameOrState.tool || '').toLowerCase();
  args = toolNameOrState.tool_args || toolNameOrState.args || {};
} else {
  tool = String(toolNameOrState || '').toLowerCase();
  args = toolArgs || {};
}`
  },

  {
    id: 'ISSUE-02',
    title: 'Omission of Native Windows Command & Shell Aliases in isDestructiveAction',
    targetModules: ['harness/jev-client.js', 'harness/jev-vetter.js'],
    exactLocations: 'harness/jev-client.js:33-64, harness/jev-vetter.js:41-72',
    codeSnippet: `const destructiveCmdPatterns = [
  /\brm\s+-[a-z]*r[a-z]*f?/i,           // rm -rf, rm -r, rm -fr
  /\brmdir\b/i,                         // rmdir
  /\bdel\s+(\/[a-z]\s+)*\/[fq]/i,       // del /f, del /q
  /\bremove-item\b.*-recurse/i,         // PowerShell Remove-Item -Recurse
  /\bgit\s+reset\b/i,                   // git reset, git reset --hard
  ...
];
const encodedMatch = cmdStr.match(/powershell(\.exe)?\s+.*-(enc|encodedcommand|e)\s+([A-Za-z0-9+/=]+)/i);`,
    failureScenario: `1. In Windows cmd.exe, 'rd /s /q <dir>' is the universally used alias for rmdir recursive directory deletion. The regex matches \brmdir\b, but does NOT match 'rd /s /q'. Executing 'cmd /c rd /s /q C:\\Project' bypasses isDestructiveAction completely.
2. In Windows cmd.exe, 'erase' is the exact built-in synonym for 'del'. Executing 'erase /f /q *.*' bypasses the check because only \bdel\b is recognized.
3. In modern cross-platform PowerShell (PowerShell 7+), the binary is 'pwsh' (pwsh.exe). The encoded command regex strictly requires 'powershell(\.exe)?', so 'pwsh -enc <base64>' bypasses encoded command inspection.
4. PowerShell standard aliases: 'ri -r -fo' (Remove-Item -Recurse -Force), 'rmdir -r -fo', 'del -r -fo' bypass the regex.`,
    intendedBehavior: `Detect all platform-native destructive directory wipes and shell aliases across Windows cmd.exe and PowerShell (pwsh/powershell), ensuring that rd /s /q, erase /f /q, pwsh -enc, and ri -r -fo trigger the destructive gate.`,
    tradeOffsAndContext: `The regexes initially targeted POSIX tools (rm, git, rmdir) and basic Windows del. In mixed Windows/Linux environments, omitting cmd.exe primary commands (rd, erase) and PowerShell Core (pwsh) leaves dangerous execution paths wide open.`,
    proposedRemediation: `Add Windows aliases and PowerShell Core to destructiveCmdPatterns:
- /\\b(rd|rmdir)\\s+(\\/[a-z]\\s+)*\\/[sq]/i
- /\\berase\\s+(\\/[a-z]\\s+)*\\/[fq]/i
- /\\b(remove-item|ri|rmdir|del)\\b.*(-r|-recurse).*(-fo|-force)/i
- Update encoded command regex to: /(powershell|pwsh)(\\.exe)?\\s+.*-(enc|encodedcommand|e)\\s+([A-Za-z0-9+/=]+)/i`
  },

  {
    id: 'ISSUE-03',
    title: 'Path Normalization Lacking Windows Backslash Support & Relative Traversal in sensitive-guard.js',
    targetModules: ['harness/sensitive-guard.js'],
    exactLocations: 'harness/sensitive-guard.js:9-20, 44-57',
    codeSnippet: `export const SENSITIVE_PATH_PATTERNS = [
  /(^|[/\\])\.env($|\..*)/i,                       // .env, .env.local, .env.production
  /(^|[/\\])(id_rsa|id_ed25519|id_ecdsa)($|\..*)/i,// SSH private keys
  /\.(pem|key|pkcs12|pfx|p12)$/i,                  // Private key certificates
  /(credentials|secrets|token|auth_token)\.(json|yaml|yml|xml)$/i, // Cloud/app secrets
  /(^|[/\\])\.aws[/\\]/i,                          // AWS credentials
  /(^|[/\\])\.config[/\\]gcloud[/\\]/i,            // GCP credentials
  /(^|[/\\])\.kube[/\\]/i,                         // Kubernetes cluster configs
  /\/etc\/(shadow|passwd)/i,                       // Unix passwords
  /\.\.[/\\]\.\.[/\\]/i                            // Path traversal attempts
];

export function isSensitivePath(targetPath = '') {
  const pathStr = String(targetPath || '');
  if (!pathStr) return false;
  ...
}`,
    failureScenario: `1. The Unix password pattern '/\\/etc\\/(shadow|passwd)/i' hardcodes forward slashes. On Windows or when paths use backslashes ('\\etc\\shadow', 'C:\\etc\\shadow', '..\\etc\\shadow'), it fails to match, allowing read without Jev security escalation.
2. The traversal pattern '/\\.\\.[\\/\\\\]\\.\\.[\\/\\\\]/i' strictly requires TWO consecutive directory traversals ('../../'). A single traversal step ('../.env' or 'src/../.env' or './.env') is not flagged by the traversal pattern.
3. Path strings are passed directly to regexes without canonicalization (e.g. path.normalize or replacing backslashes with slashes). Paths formatted as '.\\.env' or 'src\\..\\.env' or redundant separators can evade pattern detection.`,
    intendedBehavior: `Canonicalize targetPath using path.normalize(targetPath).replace(/\\\\/g, '/') prior to evaluation, and ensure sensitive regexes match Windows drive letters, backslashes, and single relative traversals.`,
    tradeOffsAndContext: `The guard relied on raw string regexes to avoid path resolution filesystem calls, but raw string matching without canonicalization allows trivial path obfuscation.`,
    proposedRemediation: `Normalize pathStr at the beginning of isSensitivePath:
const normalized = path.normalize(String(targetPath || '')).replace(/\\\\/g, '/');
And update pattern: /(^|[\\/]|([a-z]:[\\/]))etc[\\/](shadow|passwd)/i`
  },

  {
    id: 'ISSUE-04',
    title: 'Nested Sensitive Directory Traversal: Omitting Files Inside Secret Folders in sensitive-guard.js',
    targetModules: ['harness/sensitive-guard.js'],
    exactLocations: 'harness/sensitive-guard.js:13-16, 44-57',
    codeSnippet: `/(credentials|secrets|token|auth_token)\.(json|yaml|yml|xml)$/i, // Cloud/app secrets
/(^|[/\\])\.aws[/\\]/i,                          // AWS credentials
/(^|[/\\])\.config[/\\]gcloud[/\\]/i,            // GCP credentials
/(^|[/\\])\.kube[/\\]/i,                         // Kubernetes cluster configs`,
    failureScenario: `1. Pattern 13 requires the filename ITSELF to be named 'credentials.*', 'secrets.*', 'token.*', etc.
2. If a repository organizes secrets inside a folder such as 'secrets/production.json', 'secrets/db-creds.json', 'config/secrets/jwt.json', or 'keys/api.json':
   The filename is 'production.json' or 'db-creds.json'.
   isSensitivePath('secrets/production.json') returns FALSE!
3. Because isSensitivePath returns false, evaluatePathSecurity grants an instant Layer 1 Fastpath bypass (0 tokens, approved: true), completely skipping Jev Layer 2 Security escalation and allowing secret exfiltration.`,
    intendedBehavior: `Any file contained within a directory designated for sensitive materials (e.g. secrets/, credentials/, .secrets/, config/secrets/) must be flagged as sensitive, escalating to Jev Layer 2 security check.`,
    tradeOffsAndContext: `Pattern was overly specific to filenames like 'secrets.json' rather than directory trees like 'secrets/*.json'. Broadening directory detection prevents blind exfiltration of project secrets.`,
    proposedRemediation: `Add directory-level patterns to SENSITIVE_PATH_PATTERNS:
- /(^|[\\/\\\\])(\\.?secrets|credentials|certs|private_keys)[\\/\\\\]/i
- /(^|[\\/\\\\])config[\\/\\\\](secrets|keys|certs)[\\/\\\\]/i`
  },

  {
    id: 'ISSUE-05',
    title: 'Hybrid Workspace Ecosystem Contamination in manifest-sniffer.js Triggering False Core Law Vetoes',
    targetModules: ['harness/manifest-sniffer.js', 'harness/core-laws-linter.js'],
    exactLocations: 'harness/manifest-sniffer.js:38-61, harness/core-laws-linter.js:23, 45-62',
    codeSnippet: `// harness/manifest-sniffer.js:
export function isGasContext(filePath = '', codeString = '') {
  ...
  // 3. Workspace root indicators
  try {
    if (fs.existsSync(path.join(process.cwd(), '.clasp.json')) || fs.existsSync(path.join(process.cwd(), 'appsscript.json'))) {
      return true;
    }
  } catch {}
  ...
}

// harness/core-laws-linter.js:
const isGas = isGasContext(filePath, codeString);
if (isGas && !isIgnored) {
  const hardcodedIndexMatch = line.match(/\\[\\s*\\d+\\s*\\]/);
  if (hardcodedIndexMatch) {
    violations.push({ law: 'HEADER_MAP_LAW', ... });
  }
}`,
    failureScenario: `1. In a hybrid or monorepo project where Google Apps Script backend scripts coexist with React, TypeScript, or Node web components, a root '.clasp.json' or 'appsscript.json' is present.
2. Because fs.existsSync('.clasp.json') returns true, isGasContext returns true for EVERY file in the repository (e.g. 'src/components/Table.tsx', 'src/utils/matrix.ts', 'scripts/deploy.js').
3. When an agent edits 'src/components/Table.tsx' containing standard array access like 'const first = rows[0]' or 'const id = cells[1]', the Core Laws Linter triggers a HEADER_MAP_LAW violation!
4. Additionally, any standard 'new Date()' in React/TS files triggers a SAFE_SERIALIZATION_LAW violation!
5. The interceptor blocks the edit with exit code 2, forcing developers and agents into severe thrashing on completely standard frontend TypeScript code.`,
    intendedBehavior: `Header Map Law and GAS Safe Serialization rules must strictly scope to Google Apps Script files (.gs files, files in gas/appsscript/clasp folders, or clasp rootDir), and must NOT contaminate React/TS/Web components in the same workspace.`,
    tradeOffsAndContext: `The root file check was intended as a zero-config heuristic when users run isolated GAS scripts, but it catastrophically poisons multi-tier/hybrid workspaces where GAS is only a subcomponent.`,
    proposedRemediation: `Refine isGasContext:
If .clasp.json exists, read its 'rootDir' setting if available. Only return true if filePath is inside clasp rootDir, or ends with .gs, or is inside a /gas/, /appsscript/, or /clasp/ directory, or contains GAS APIs. If filePath has typical frontend/web extensions (.tsx, .jsx, .vue, .svelte, .py) and does NOT contain GAS APIs, do NOT flag it as GAS.`
  },

  {
    id: 'ISSUE-06',
    title: 'Test Runner Output Parser Blindspots in runner-parser.js (Mocha, TAP Streams, 100% Skipped)',
    targetModules: ['harness/runner-parser.js'],
    exactLocations: 'harness/runner-parser.js:53-96, 182-197',
    codeSnippet: `switch ((ecosystem || '').toLowerCase()) {
  case 'node': {
    // Jest / Vitest: "Tests: 12 passed, 12 total"
    const jestMatch = combined.match(/Tests:\\s+(\\d+)\\s+passed,\\s+(\\d+)\\s+total/i);
    ...
    // node:test: "[INFO] pass 12\\n[INFO] fail 0"
    const nodeTestMatch = combined.match(/[INFO]?\\s*pass\\s+(\\d+)\\s+[INFO]?\\s*fail\\s+(\\d+)/i);
    ...
}
// Generic fallback if no specific framework matched but exit code is 0
return { passed: true, testsRun: 1, fallback: true, ... };`,
    failureScenario: `1. Mocha test failures: Mocha prints '0 passing (2ms)\\n2 failing'. This is not matched by jestMatch, summaryMatch, or nodeTestMatch. If Mocha is invoked in a script that completes with exit 0, it falls through to generic fallback and returns passed: true!
2. TAP stream failures: Native TAP format (used by tape, tap, or node --test --test-reporter=tap) outputs 'not ok 1 - test failed' and '# fail 1'. runner-parser has no TAP regex. It falls through to generic fallback and reports passed: true!
3. 100% Skipped suites: Jest/Vitest outputs 'Tests: 5 skipped, 5 total' (0 passed). jestMatch requires 'passed, total', so it fails to match. It falls through to generic fallback and reports passed: true!
4. Stage 2 of Acceptance Gate receives tests_passed: 1, tests_failed: 0 and falsely approves broken or skipped test suites.`,
    intendedBehavior: `The semantic parser must recognize Mocha summary formats ('\\d+ failing'), TAP stream failure markers ('^not ok', '# fail \\d+'), and explicitly detect 100% skipped suites ('Tests: \\d+ skipped, \\d+ total' with 0 passed) as unverified/failing.`,
    tradeOffsAndContext: `The parser implemented Jest and node:test happy paths, but lacked negative matching for common Node ecosystems (Mocha, TAP) and skipped-test evasion.`,
    proposedRemediation: `Add to runner-parser.js:
- Mocha failure parser: combined.match(/(\\d+)\\s+passing.*(\\d+)\\s+failing/is) or /(\\d+)\\s+failing/i
- TAP stream parser: /^not ok\\s+\\d+/m or /# fail\\s+([1-9]\\d*)/i
- Skipped-only detection: combined.match(/Tests:\\s+(\\d+)\\s+skipped,\\s+(\\d+)\\s+total/i) -> if skipped === total, return passed: false`
  },

  {
    id: 'ISSUE-07',
    title: 'Unsanitized customCommand Execution in verifyAcceptanceGate (acceptance-gate.js)',
    targetModules: ['harness/acceptance-gate.js'],
    exactLocations: 'harness/acceptance-gate.js:19-39, 96-102',
    codeSnippet: `export async function verifyAcceptanceGate(customCommand = null, targetDir = process.cwd()) {
  const workspace = detectWorkspaceEcosystem(targetDir);
  const testCommand = customCommand || workspace.testCommand || 'npm test';

  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    const res = await execAsync(testCommand, {
      cwd: targetDir,
      timeout: 45000,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0' }
    });
...`,
    failureScenario: `1. verifyAcceptanceGate accepts a customCommand parameter from CLI arguments (process.argv) or from interceptor.js (mode === 'verify-gate', arg1).
2. The customCommand is passed directly to execAsync(testCommand) without vetting.
3. If an autonomous agent or untrusted input passes a malicious or destructive command (e.g. 'npm test && rm -rf /' or 'cat .env' or 'node -e "process.exit(0)"'), it executes with full user privileges in the shell.
4. While interceptor.js guards 'pre-tool', the 'verify-gate' hook dispatches directly to verifyAcceptanceGate(arg1), bypassing preToolUse destructive action checks.`,
    intendedBehavior: `Sanitize customCommand before execution: verify that it does not contain destructive patterns (isDestructiveAction), shell chaining delimiters (;, &&, ||) for unapproved binaries, or validate against an allowlist of trusted test runners (npm, yarn, pnpm, bun, pytest, cargo, go, gradle, make).`,
    tradeOffsAndContext: `customCommand was provided for developer flexibility to run custom test scripts (e.g. 'npm run test:unit'), but executing arbitrary strings in execAsync without destructive gating creates an arbitrary command execution vector.`,
    proposedRemediation: `Validate customCommand before execution:
if (customCommand) {
  if (isDestructiveAction('acceptance_gate', { command: customCommand })) {
    return { passed: false, reason: 'Custom test command contains destructive actions or hazardous patterns.' };
  }
}`
  },

  {
    id: 'ISSUE-08',
    title: 'Cycle Detector Telemetry Distortion: checkCycle Returning Default repeatCount: 1 when isThrashing is False',
    targetModules: ['harness/cycle-detector.js'],
    exactLocations: 'harness/cycle-detector.js:183-211, 257-263',
    codeSnippet: `if (targetFile && len >= 3) {
  const recentEdits = [];
  for (let i = len - 1; i >= 0; i--) {
    if (history[i].targetFile === targetFile) {
      recentEdits.push(history[i]);
    } else {
      break;
    }
  }

  const repeatCount = recentEdits.length;
  const allowed = editClassification.allowedRepeats; // 3 or 5

  if (repeatCount >= allowed) {
    return {
      isThrashing: true,
      reason: ...,
      repeatCount,
      ...
    };
  }
}
...
return {
  isThrashing: false,
  repeatCount: 1, // <--- ALWAYS HARDCODED TO 1!
  variance: editClassification.variance,
  allowedRepeats: editClassification.allowedRepeats
};`,
    failureScenario: `1. An agent edits 'auth.js' a 2nd consecutive time (under novel exploration where allowed=5).
2. recentEdits.length is 2. repeatCount is 2.
3. Because repeatCount < 5, isThrashing is false.
4. checkCycle returns { isThrashing: false, repeatCount: 1 }.
5. On the 3rd consecutive edit: returns { isThrashing: false, repeatCount: 1 }.
6. On the 4th consecutive edit: returns { isThrashing: false, repeatCount: 1 }.
7. On the 5th edit: SUDDENLY jumps from repeatCount: 1 to repeatCount: 5 with isThrashing: true!
8. Any caller, dashboard, telemetry hook, or developer monitoring repeatCount sees '1' constantly, masking the fact that the agent is on the verge of thrashing and preventing proactive early warning.`,
    intendedBehavior: `checkCycle should return the actual computed consecutive repeat count (e.g. recentEdits.length || 1) so callers have accurate real-time visibility into edit progression.`,
    tradeOffsAndContext: `The fallback return statement defaulted to 1 because thrashing was not yet reached, but this threw away the exact telemetry already calculated in the loop.`,
    proposedRemediation: `Store the computed consecutive count in a local variable before the thrashing check, and return it in the final result:
let computedRepeatCount = 1;
if (targetFile && len >= 1) {
  // calculate recentEdits
  computedRepeatCount = recentEdits.length;
  if (computedRepeatCount >= allowed) return { isThrashing: true, repeatCount: computedRepeatCount, ... };
}
return { isThrashing: false, repeatCount: computedRepeatCount, ... };`
  },

  {
    id: 'ISSUE-09',
    title: 'Virtual Shadow Buffer Fallback Corrupting Buffer on Whitespace/CRLF Drift (cycle-detector.js)',
    targetModules: ['harness/cycle-detector.js'],
    exactLocations: 'harness/cycle-detector.js:58-69',
    codeSnippet: `let reconstructed = baseContent;
if (targetContent && reconstructed.includes(targetContent)) {
  reconstructed = reconstructed.replace(targetContent, replacementContent);
} else if (replacementContent) {
  reconstructed = baseContent ? \`\${baseContent}\\n\${replacementContent}\` : replacementContent;
}

// Cache updated shadow buffer
try {
  fs.writeFileSync(shadowFile, reconstructed, 'utf8');
} catch {}`,
    failureScenario: `1. When replace_file_content is called, targetContent may differ slightly from baseContent due to CRLF vs LF line endings, trailing whitespace, or indentation.
2. reconstructed.includes(targetContent) evaluates to false.
3. Instead of reporting a replacement failure or attempting whitespace-normalized replacement, the fallback executes:
   reconstructed = \`\${baseContent}\\n\${replacementContent}\`
4. It writes this corrupted text directly to shadowFile on disk!
5. The shadow buffer now contains the entire original file PLUS the replacement chunk appended at the end of the file.
6. Subsequent Core Laws linting and diff variance calculations evaluate a duplicated, syntactically broken file with invalid code at EOF, triggering false syntax errors or distorted variance.`,
    intendedBehavior: `If exact targetContent matching fails:
1. Attempt CRLF/LF normalization and trimmed matching.
2. If replacement still cannot be performed, preserve baseContent without blindly appending replacementContent to EOF and corrupting the shadow file.`,
    tradeOffsAndContext: `The fallback was intended for write_to_file where whole content is provided, but in replace_file_content where targetContent is specified, appending replacementContent to EOF corrupts the file.`,
    proposedRemediation: `In reconstructShadowBuffer:
- Normalize line endings: reconstructed.replace(/\\r\\n/g, '\\n') and targetContent.replace(/\\r\\n/g, '\\n').
- If targetContent is specified but cannot be found, do NOT append replacementContent to EOF. Keep reconstructed as baseContent (or return baseContent without writing corrupted shadow).`
  },

  {
    id: 'ISSUE-10',
    title: 'Diff Variance Scaling Flaws on Large Files (>2500 chars): Set Collisions & Skipped Structural Checks',
    targetModules: ['harness/diff-variance.js'],
    exactLocations: 'harness/diff-variance.js:74-102',
    codeSnippet: `// Fast path for very large strings: compute line-based variance to prevent O(N*M) CPU stall
if (maxLen > 2500) {
  const prevLines = p.split('\\n').map(l => l.trim()).filter(Boolean);
  const currLines = c.split('\\n').map(l => l.trim()).filter(Boolean);

  const prevSet = new Set(prevLines);
  const currSet = new Set(currLines);

  let common = 0;
  for (const line of currLines) {
    if (prevSet.has(line)) common++;
  }

  const totalLines = Math.max(prevLines.length, currLines.length, 1);
  const similarity = common / totalLines;
  return Math.round((1.0 - similarity) * 100) / 100;
}

const dist = levenshteinDistance(p, c);
...
// Also calculate structural variance (ignoring comments and whitespace)
const pStruct = normalizeStructure(p);
const cStruct = normalizeStructure(c);
if (pStruct === cStruct && p !== c) {
  return 0.05;
}`,
    failureScenario: `1. Files > 2500 characters (~50-60 lines of code) immediately enter the fast path and return line-based variance.
2. The structural normalization check (normalizeStructure) is NEVER reached for files > 2500 chars!
   Therefore, for almost all production code files, editing comments or adding docstrings is NEVER recognized as cosmetic (variance remains > 0.05), defeating the structural comment detection feature.
3. In the line-based algorithm, 'prevSet.has(line)' uses a Set, which discards line frequency.
   Common lines in code (such as '}', 'return;', 'break;', 'export default router;') collide.
   If currLines has ten '}' lines and prevSet has one '}', all 10 increment 'common++', distorting the similarity metric.`,
    intendedBehavior: `1. Run normalizeStructure prior to the length cutoff so that cosmetic comment changes in files of any size are properly recognized (returning 0.05).
2. In the line-based fast path, use multiset frequency maps or Levenshtein over line hashes rather than Set.has to preserve line frequency accuracy.`,
    tradeOffsAndContext: `Levenshtein distance O(N*M) stalls Node if run on 50KB strings, which justified the fast path. However, placing the structural check after the fast path return broke comment normalization for all non-trivial files.`,
    proposedRemediation: `Move the structural check above the maxLen > 2500 branch:
const pStruct = normalizeStructure(p);
const cStruct = normalizeStructure(c);
if (pStruct === cStruct && p !== c) return 0.05;
And replace Set.has with frequency counting Map.`
  },

  {
    id: 'ISSUE-11',
    title: 'Malformed JSON Tool Calls in safeParseJson Falling Back to Empty Object and Bypassing Destructive Gate',
    targetModules: ['harness/interceptor.js'],
    exactLocations: 'harness/interceptor.js:34-93, 142-154, 201-217',
    codeSnippet: `export function safeParseJson(raw) {
  if (!raw) return {};
  ... // 5 heuristic repair attempts
  return {};
}
...
const stdinData = await readStdinJson();
toolName = stdinData.toolCall?.name || stdinData.name || '';
toolArgs = stdinData.toolCall?.args || stdinData.args || {};
...
const isDestructive = isDestructiveAction(toolName, toolArgs);
if (isDestructive) { ... }
process.exit(0); // Approved!`,
    failureScenario: `1. An agent or engine emits a tool call with malformed or truncated JSON (e.g. unescaped quotes or newlines in a bash command like: { "command": "rm -rf / --no-preserve-root "quoted" } ).
2. safeParseJson fails all 5 heuristic repairs and returns {}.
3. In interceptor.js: toolName becomes '', toolArgs becomes {}.
4. isDestructiveAction('', {}) returns false.
5. Core Laws check is skipped (no content).
6. Cycle detector check passes (empty key).
7. Interceptor exits with code 0: Approved to proceed!
8. The underlying agentic runner or shell then executes the raw command without having been vetted by Jev or the destructive gate, enabling a catastrophic fail-open on malformed inputs.`,
    intendedBehavior: `If safeParseJson fails to parse a non-empty payload, the interceptor must NOT silently fail open. It should either:
1. Scan the raw input string for destructive keywords (rm, drop, git reset, del, rd, etc.). If destructive patterns exist, enforce a fail-closed veto (exit 2).
2. Or reject malformed non-empty payloads with an explicit parsing error veto so the agent re-formats the tool call.`,
    tradeOffsAndContext: `safeParseJson was designed to be forgiving of minor JSON quirks from LLMs, but falling back to {} without checking the raw string for destructive operations creates a dangerous fail-open security bypass.`,
    proposedRemediation: `If safeParseJson returns an empty object from a non-empty raw string:
const rawStr = String(raw || '');
if (rawStr.trim().length > 0) {
  // Check if raw unparsed payload contains destructive patterns
  if (isDestructiveAction('raw_payload', { command: rawStr })) {
    console.error('[WARN]️ [JEV SECURITY BLOCK]: Malformed tool call payload contains destructive patterns. Hard fail-closed enforced.');
    process.exit(2);
  }
}`
  }
];

async function adjudicateWithJev(candidate) {
  console.log(`\n======================================================`);
  console.log(`Adjudicating [${candidate.id}]: ${candidate.title}`);
  console.log(`Target: ${candidate.exactLocations}`);
  console.log(`======================================================`);

  const state = {
    candidate_id: candidate.id,
    title: candidate.title,
    target_modules: candidate.targetModules,
    code_location: candidate.exactLocations,
    code_snippet: candidate.codeSnippet,
    failure_scenario: candidate.failureScenario,
    intended_harness_behavior: candidate.intendedBehavior,
    architectural_tradeoffs_and_context: candidate.tradeOffsAndContext,
    proposed_remediation: candidate.proposedRemediation
  };

  const questions = {
    is_genuine_issue: {
      type: 'noul',
      instructions: `Is this candidate issue an actual, genuine flaw, vulnerability, operational blindspot, or defect in the Aegis harness that requires remediation (P >= 0.70), or is it an intended design / benign non-issue / acceptable trade-off (P < 0.70)?`,
      criteria: {
        true: `This is an actual defect, vulnerability, silent failure, or operational flaw that degrades safety, correctness, or developer experience and must be fixed.`,
        false: `This is acceptable behavior, intended architecture, harmless trade-off, or non-issue that should remain as is.`
      }
    },
    severity: {
      type: 'choice',
      instructions: `Classify the severity of this issue. If it is not a genuine issue, select intended_design_non_issue.`,
      criteria: {
        critical: `Critical vulnerability: arbitrary command execution, silent bypass of safety blocks for destructive actions, or fatal runtime crash.`,
        high: `High severity: false positive veto blocking legitimate workflow, false pass on failing test suites, or state/shadow corruption.`,
        medium: `Medium severity: telemetry distortion, edge-case bypass, or algorithmic scaling inaccuracy.`,
        low: `Low severity: minor cosmetic or edge-case inconvenience.`,
        intended_design_non_issue: `Working as intended, expected architectural boundary, or non-issue.`
      }
    },
    impact_domain: {
      type: 'choice',
      instructions: `What is the primary impact domain of this candidate issue?`,
      criteria: {
        security_integrity: `Security bypass, credential leakage risk, or arbitrary command execution.`,
        runtime_correctness: `Incorrect veto/pass decisions, unhandled runtime exceptions, or corrupted shadow state.`,
        developer_experience: `False positive vetoes on valid code, misleading telemetry, or excessive friction.`,
        non_issue: `Non-issue / intended design with no negative impact.`
      }
    },
    remediation_soundness: {
      type: 'noul',
      instructions: `Does the proposed technical remediation effectively eliminate the defect while preserving the harness's zero-dependency, low-latency, and safe-by-default architecture?`,
      criteria: {
        true: `The remediation is sound, robust, minimally invasive, and aligns with Aegis harness design principles.`,
        false: `The remediation is unnecessary, flawed, overly complex, or introduces new failure modes.`
      }
    }
  };

  try {
    const response = await callJevSystemOne({
      state,
      questions,
      model: 'jev-1.13.0',
      timeoutMs: 15000
    });

    const isGenuineProb = response.answers?.is_genuine_issue?.noul ?? 0.5;
    const isGenuineConfirmed = isGenuineProb >= 0.70;
    const severityChoice = response.answers?.severity?.choice || 'medium';
    const impactDomainChoice = response.answers?.impact_domain?.choice || 'runtime_correctness';
    const remediationProb = response.answers?.remediation_soundness?.noul ?? 0.8;

    const ruling = {
      candidate_id: candidate.id,
      title: candidate.title,
      target_modules: candidate.targetModules,
      exact_locations: candidate.exactLocations,
      is_genuine_issue: {
        probability: isGenuineProb,
        confirmed: isGenuineConfirmed,
        classification: isGenuineConfirmed ? 'CONFIRMED_ISSUE' : 'NON_ISSUE_INTENDED_DESIGN'
      },
      severity: isGenuineConfirmed ? severityChoice : 'intended_design_non_issue',
      severity_confidence: response.answers?.severity?.confidence ?? 1.0,
      severity_distribution: response.answers?.severity?.probabilities ?? {},
      impact_domain: isGenuineConfirmed ? impactDomainChoice : 'non_issue',
      impact_domain_confidence: response.answers?.impact_domain?.confidence ?? 1.0,
      remediation: {
        proposed_action: candidate.proposedRemediation,
        soundness_probability: remediationProb,
        endorsed: remediationProb >= 0.70
      },
      usage: response.usage,
      model: response.model,
      adjudicated_at: new Date().toISOString()
    };

    console.log(`Jev Ruling: ${ruling.is_genuine_issue.classification} (P=${isGenuineProb.toFixed(2)})`);
    console.log(`Severity: ${ruling.severity} | Domain: ${ruling.impact_domain}`);
    console.log(`Remediation Soundness: P=${remediationProb.toFixed(2)}`);

    return ruling;
  } catch (err) {
    console.error(`Error adjudicating ${candidate.id}:`, err.message);
    throw err;
  }
}

async function runHolisticAudit() {
  console.log(`\n======================================================`);
  console.log(`[LAUNCH] Starting Definitive Jev Governance Audit across 11 Modules`);
  console.log(`Model: jev-1.13.0 via TypeSafe AI System One`);
  console.log(`Candidate Issues to Adjudicate: ${CANDIDATES.length}`);
  console.log(`======================================================\n`);

  const results = [];

  for (const candidate of CANDIDATES) {
    const ruling = await adjudicateWithJev(candidate);
    results.push(ruling);
    // 250ms spacing between API calls
    await new Promise(r => setTimeout(r, 250));
  }

  const confirmedIssues = results.filter(r => r.is_genuine_issue.confirmed);
  const nonIssues = results.filter(r => !r.is_genuine_issue.confirmed);

  // Group confirmed issues by severity
  const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
  confirmedIssues.sort((a, b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5));

  const finalArtifact = {
    metadata: {
      audit_type: 'Definitive Holistic Aegis Harness Audit',
      governance_engine: 'TypeSafe AI Jev (jev-1.13.0)',
      api_endpoint: 'https://api.typesafe.ai/v1/systemone',
      adjudication_threshold: 'P >= 0.70 for Confirmed Issue',
      timestamp: new Date().toISOString(),
      total_candidates: CANDIDATES.length,
      total_confirmed_issues: confirmedIssues.length,
      total_non_issues: nonIssues.length
    },
    summary: {
      critical: confirmedIssues.filter(r => r.severity === 'critical').length,
      high: confirmedIssues.filter(r => r.severity === 'high').length,
      medium: confirmedIssues.filter(r => r.severity === 'medium').length,
      low: confirmedIssues.filter(r => r.severity === 'low').length,
      non_issues: nonIssues.length
    },
    confirmed_issues: confirmedIssues,
    non_issues_or_intended_design: nonIssues,
    prioritized_remediation_roadmap: confirmedIssues.map((issue, idx) => ({
      priority: idx + 1,
      id: issue.candidate_id,
      title: issue.title,
      severity: issue.severity,
      impact_domain: issue.impact_domain,
      probability: issue.is_genuine_issue.probability,
      target_module: issue.target_modules.join(', '),
      exact_locations: issue.exact_locations,
      remediation_action: issue.remediation.proposed_action
    }))
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalArtifact, null, 2), 'utf8');
  console.log(`\n======================================================`);
  console.log(`[PASS] Audit Completed Successfully!`);
  console.log(`Artifact saved to: ${OUTPUT_FILE}`);
  console.log(`Confirmed Issues: ${confirmedIssues.length} / ${CANDIDATES.length}`);
  console.log(`Non-Issues / Intended Design: ${nonIssues.length} / ${CANDIDATES.length}`);
  console.log(`======================================================\n`);
}

runHolisticAudit().catch(err => {
  console.error('Holistic audit failed:', err);
  process.exit(1);
});
