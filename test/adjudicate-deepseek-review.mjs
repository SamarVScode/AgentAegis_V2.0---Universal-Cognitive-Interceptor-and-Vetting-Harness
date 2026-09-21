/**
 * DeepSeek Review Adjudication Script
 * Submits all 22 claims from aaa.txt to TypeSafe AI Jev System One (jev-1.13.0)
 * Evaluates ground truth validity, severity, and statistical confidence.
 * ZERO EMOJIS in all scripts, logs, and markdown output.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const reviewClaims = [
  {
    id: 'C1',
    category: 'Critical',
    title: 'Claude Code stdin envelope parsed incorrectly in interceptor.js',
    targetFile: 'harness/interceptor.js',
    codeContext: `// interceptor.js lines 160-174:
} else {
  toolName = arg1 || '';
  if (arg2) {
    toolArgs = safeParseJson(arg2);
    // ...
  } else {
    const stdinData = await readStdinJson();
    toolArgs = Object.keys(stdinData).length > 0 ? stdinData : {};
  }
}
const targetFile = toolArgs.TargetFile || toolArgs.file_path || toolArgs.path || '';`,
    claim: `Claude Code sends {"tool_name": "Edit", "tool_input": {...}} over stdin when invoking hooks. The code assigns the entire stdinData object to toolArgs instead of unwrapping tool_input, leaving toolName empty when arg1 is not passed and toolArgs.file_path undefined. This causes cycle detector, linter, and safety checks to receive empty parameters and effectively no-op on Claude Code.`,
    assertion: `Does the current stdin parsing in interceptor.js fail to unpack Claude Code's {"tool_name", "tool_input"} hook envelope, resulting in empty toolName and missing arguments?`
  },
  {
    id: 'C2',
    category: 'Critical',
    title: 'jev-vetter.js is dead code vs zero-token fastpath architecture',
    targetFile: 'harness/jev-vetter.js',
    codeContext: `// interceptor.js imports:
import { isDestructiveAction, jevBooleanCheck } from './jev-client.js';
// jev-vetter.js defines vetProposedAction(state, cycleStatus) which starts an MCP client via stdio.
// In interceptor.js, Jev is only called if isDestructiveAction is true or path is sensitive.
// Normal edits pass through without network calls (zero-token fastpath).`,
    claim: `interceptor.js imports from jev-client.js, not jev-vetter.js. The intended 'vet every tool call with Jev' function vetProposedAction is never called. For normal edits, tests, and file operations (~90% of tool calls), Jev is not consulted at all. The core 'veto-guard' premise collapses.`,
    assertion: `Is the absence of vetProposedAction in interceptor.js a critical flaw where the veto-guard premise collapses, OR is it an intentional zero-token fastpath design where Jev is reserved for destructive operations and the acceptance gate?`
  },
  {
    id: 'C3',
    category: 'Critical',
    title: '.jev/ directory at project root readable by agent',
    targetFile: 'harness/cycle-detector.js',
    codeContext: `// cycle-detector.js lines 12-15:
export function getSessionPaths(sessionId = 'default') {
  const sanitizedId = (sessionId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(process.cwd(), '.jev', sanitizedId);
// sensitive-guard.js does not include .jev in SENSITIVE_PATH_PATTERNS`,
    claim: `.jev/ is located at project root and not guarded by sensitive-guard.js. The agent has Read access and can inspect its own action history, variance classifications, and shadow buffers, allowing it to game the cycle detector or leak internal telemetry into agent context.`,
    assertion: `Does storing session history and shadow buffers in .jev/ at process.cwd() without sensitive-guard blocking create a vulnerability where the agent can inspect and game its own cycle detector state?`
  },
  {
    id: 'C4',
    category: 'Critical',
    title: 'Claude Code hook schema in install.js is flat instead of nested matcher',
    targetFile: 'harness/install.js',
    codeContext: `// install.js lines 90-101:
if (!Array.isArray(updated.hooks.PreToolUse)) updated.hooks.PreToolUse = [];
const preIdx = updated.hooks.PreToolUse.findIndex(h => typeof h === 'object' && h.command && h.command.includes('interceptor.js'));
if (preIdx !== -1) updated.hooks.PreToolUse[preIdx] = { command: preToolCmd };
else updated.hooks.PreToolUse.push({ command: preToolCmd });`,
    claim: `Claude Code settings.json hook schema requires { matcher: '.*', hooks: [{ type: 'command', command: '...' }] }. The installer writes a flat { command: '...' } object which Claude Code will not recognize or execute, causing hooks to silently never fire.`,
    assertion: `Does install.js write an invalid flat schema { command } for Claude Code hooks instead of the required { matcher, hooks: [{ type, command }] }, causing Claude Code to ignore installed hooks?`
  },
  {
    id: 'C5',
    category: 'Critical',
    title: 'console.log pollutes hook and MCP channels in interceptor.js and acceptance-gate.js',
    targetFile: 'harness/interceptor.js',
    codeContext: `// interceptor.js lines 271-273:
if (gateResult.passed) {
  console.log('\\n======================================================');
  console.log('[JEV ACCEPTANCE GATE]: Verification Passed (' + gateResult.reason + ')');
  console.log('======================================================\\n');
  process.exit(0);
}`,
    claim: `Hook stdout is interpreted by Claude Code and in MCP contexts any stdout output corrupts the JSON transport channel. Hook scripts must never write to stdout; all diagnostic output must go to console.error (stderr).`,
    assertion: `Does writing plain text banners to stdout via console.log in lifecycle hook scripts risk corrupting JSON transport channels or stdout-driven hook protocols?`
  },
  {
    id: 'H1',
    category: 'High',
    title: 'Session ID collision on default-session when env vars are missing',
    targetFile: 'harness/interceptor.js',
    codeContext: `// interceptor.js line 147:
const sessionId = process.env.CONVERSATION_ID || process.env.CLAUDE_CONVERSATION_ID || 'default-session';`,
    claim: `When neither CONVERSATION_ID nor CLAUDE_CONVERSATION_ID is set, all executions share 'default-session'. State bleeds across distinct projects and user sessions. Fix: fallback to a hash of cwd and git branch.`,
    assertion: `Is using a static 'default-session' fallback without workspace scoping a defect that causes cross-session history collisions when environment variables are omitted?`
  },
  {
    id: 'H2',
    category: 'High',
    title: 'readStdinJson timeout too short on Unix (100ms)',
    targetFile: 'harness/interceptor.js',
    codeContext: `// interceptor.js line 101:
const defaultTimeout = process.platform === 'win32' ? 350 : 100;`,
    claim: `100ms on Unix is too short under heavy load or subshell execution. Claude Code may not finish piping the payload in 100ms, causing empty payload fallback and allowing tools to execute unchecked. Fix: 500ms timeout or rely on stream 'end'.`,
    assertion: `Is a 100ms timeout on Unix for reading stdin payloads an operational risk that can prematurely time out and miss piped hook payloads under load?`
  },
  {
    id: 'H3',
    category: 'High',
    title: 'Model tags contradict frozen plan and floating tag used',
    targetFile: 'harness/jev-client.js',
    codeContext: `// jev-client.js lines 19, 164:
export const DEFAULT_MODEL = 'jev-1.13.0';
const resolvedModel = model || (isTypeSafeNative ? DEFAULT_MODEL : '~typesafe/jev-latest');`,
    claim: `jev-1.13.0 is allegedly unverified, and ~typesafe/jev-latest is a floating tag. Two model tags for two paths is inconsistent. Claimed fix: pin to typesafe/jev-1.13-20260917 everywhere.`,
    assertion: `Is the model identifier 'jev-1.13.0' an invalid or unverified tag, making the implementation incorrect, or is it the verified native identifier for TypeSafe System One?`
  },
  {
    id: 'H4',
    category: 'High',
    title: 'Native TypeSafe endpoint unverified and risk of schema divergence',
    targetFile: 'harness/jev-client.js',
    codeContext: `// jev-client.js line 17:
export const TYPESAFE_API_URL = process.env.TYPESAFE_BASE_URL || 'https://api.typesafe.ai/v1/systemone';
// Payload: { model, state, questions }`,
    claim: `Payload shape may differ from OpenRouter. If native endpoint expects a different schema, every native call fails. Reviewer says: either test against live native endpoint and document, or remove native path entirely.`,
    assertion: `Is the native TypeSafe AI System One endpoint (https://api.typesafe.ai/v1/systemone) unverified and broken with the { model, state, questions } payload schema?`
  },
  {
    id: 'H5',
    category: 'High',
    title: 'Claim reconciliation too strict on file extensions (.ts vs .js)',
    targetFile: 'harness/acceptance-gate.js',
    codeContext: `// acceptance-gate.js lines 76-88:
for (const claimedPath of safeClaims.fileModifications) {
  const resolved = path.resolve(effectiveWorkspace, claimedPath);
  if (!fs.existsSync(resolved)) {
    return {
      reconciled: false,
      reason: 'Blatant fabrication: Agent claimed to create/modify ' + claimedPath + '...',
      hardVeto: true
    };
  }
}`,
    claim: `If agent says 'Created src/auth.js' but wrote src/auth.ts (or jsx/tsx), fs.existsSync fails and issues a hard veto for blatant fabrication. Extension mismatch causes false positive vetoes. Fix: check extension variants (.ts, .tsx, .jsx).`,
    assertion: `Does checking only the exact verbatim path string in claim reconciliation without resolving common extension variations (.js/.ts/.tsx) risk false-positive hard vetoes on benign agent summaries?`
  },
  {
    id: 'H6',
    category: 'High',
    title: 'Runner output regex spoofing via loose N passed, 0 failed',
    targetFile: 'harness/runner-parser.js',
    codeContext: `// runner-parser.js line 106:
const summaryMatch = combined.match(/Test Summary:\\s*(\\d+)\\s+passed,\\s*(\\d+)\\s+failed/i) ||
                     combined.match(/(\\d+)\\s+passed,\\s*0\\s+failed/i);`,
    claim: `An agent running node -e "console.log('5 passed, 0 failed')" matches the loose regex and fakes a test pass. Fix: remove loose fallback and require framework prefixes.`,
    assertion: `Does the generic regex (\\d+) passed, 0 failed in runner-parser.js create a spoofing vulnerability where arbitrary console logs can fool the parser into approving a test run?`
  },
  {
    id: 'M1',
    category: 'Medium',
    title: 'Dual model tag inconsistency across native and OpenRouter paths',
    targetFile: 'harness/jev-client.js',
    codeContext: `// DEFAULT_MODEL = 'jev-1.13.0' vs '~typesafe/jev-latest'`,
    claim: `Two different model tag conventions are used depending on provider. Should be unified or explicitly documented.`,
    assertion: `Is maintaining provider-specific model tags (native jev-1.13.0 vs OpenRouter ~typesafe/jev-latest) a defect or a necessary provider-specific routing mechanism?`
  },
  {
    id: 'M2',
    category: 'Medium',
    title: 'compressToolHistory is dead code in state-collector.js',
    targetFile: 'harness/state-collector.js',
    codeContext: `// state-collector.js line 25:
export function compressToolHistory(history = []) { ... }`,
    claim: `compressToolHistory is exported in state-collector.js but never imported or invoked in interceptor.js.`,
    assertion: `Is compressToolHistory currently unused in the production interceptor pipeline?`
  },
  {
    id: 'M3',
    category: 'Medium',
    title: 'hashArgument truncation to 8 hex chars risks collision',
    targetFile: 'harness/state-collector.js',
    codeContext: `// state-collector.js line 18:
return crypto.createHash('sha256').update(val).digest('hex').slice(0, 8);`,
    claim: `8 hex chars = 32 bits. Birthday collision at ~65k entries. Risky across sessions.`,
    assertion: `Does slicing SHA-256 to 8 hex characters for truncated prompt display annotations represent a significant collision defect in the vetting pipeline?`
  },
  {
    id: 'M4',
    category: 'Medium',
    title: 'pruneOldSessions runs on every loadSession and saveSession',
    targetFile: 'harness/cycle-detector.js',
    codeContext: `// cycle-detector.js lines 125, 145:
export function loadSession(sessionId = 'default') {
  pruneOldSessions();
export function saveSession(session, sessionId = 'default') {
  pruneOldSessions();`,
    claim: `pruneOldSessions performs directory readdirSync and statSync on every single tool hook execution instead of running once at startup or lazily, causing unnecessary I/O overhead.`,
    assertion: `Is executing a directory-wide pruneOldSessions on every load and save an I/O inefficiency that should be throttled or run once per session?`
  },
  {
    id: 'M5',
    category: 'Medium',
    title: 'isGasContext checks process.cwd() instead of traversing from filePath',
    targetFile: 'harness/manifest-sniffer.js',
    codeContext: `// manifest-sniffer.js lines 63-67:
try {
  if (fs.existsSync(path.join(process.cwd(), '.clasp.json')) || fs.existsSync(path.join(process.cwd(), 'appsscript.json'))) {
    return true;
  }
} catch {}`,
    claim: `isGasContext checks for .clasp.json at process.cwd(). In monorepo workspaces where the target file is in a subdirectory package with its own clasp config, or cwd is outside, detection is inaccurate. Should traverse upward from filePath.`,
    assertion: `Does checking process.cwd() instead of traversing upward from filePath for .clasp.json lead to inaccurate ecosystem detection in nested monorepo packages?`
  },
  {
    id: 'M6',
    category: 'Medium',
    title: '.env reads not blocked and content scanning omitted for read files',
    targetFile: 'harness/sensitive-guard.js',
    codeContext: `// sensitive-guard.js blocks reading files named .env, but interceptor dotenv loads .env. Also cat README.md is not scanned for inner references to .env.`,
    claim: `sensitive-guard.js blocks .env when reading, but interceptor dotenv reads it. Also reading README.md is allowed without scanning file contents for .env text.`,
    assertion: `Is allowing the interceptor process to load its own .env configuration and not scanning benign source/doc file contents for references to .env strings a security flaw?`
  },
  {
    id: 'M7',
    category: 'Medium',
    title: 'interceptor.js fails open on unexpected errors without persistent audit log',
    targetFile: 'harness/interceptor.js',
    codeContext: `// interceptor.js lines 290-293:
runInterceptor().catch(err => {
  console.error('Interceptor unexpected error:', err.message);
  process.exit(0);
});`,
    claim: `Any unhandled exception in the interceptor causes it to fail open gracefully with process.exit(0), allowing tools through unchecked with no persistent audit file (such as ~/.harness/errors.log).`,
    assertion: `Is failing open on unexpected errors without appending to a persistent audit log an operational observability flaw that conceals interceptor crashes?`
  },
  {
    id: 'MM',
    category: 'MissingModules',
    title: 'Four missing modules alleged from frozen plan (config, bootstrap, telemetry, state)',
    targetFile: 'harness/',
    codeContext: `Reviewer alleges 4 missing modules:
1. config.js (Obsidian frontmatter loader + repo matcher)
2. bootstrap.js (Progressive cold-start)
3. telemetry.js (Log every Jev call)
4. state.js (SQLite persistence across sessions)`,
    claim: `The codebase is missing config.js, bootstrap.js, telemetry.js, and state.js which were part of the frozen plan, preventing cross-session SQLite state, cost tracking, and Obsidian frontmatter config.`,
    assertion: `Are the 4 modules (config.js, bootstrap.js, telemetry.js, state.js) strictly necessary for TypeSafe Aegis core interceptor function, or does the file-based JSON session store and zero-token architecture adequately fulfill the interceptor specification?`
  }
];

async function adjudicateAll() {
  console.log('--------------------------------------------------------------------------------');
  console.log('TYPE-SAFE AI JEV SYSTEM ONE REVIEW AUDITOR AND ADJUDICATOR');
  console.log('Target: https://api.typesafe.ai/v1/systemone | Model: jev-1.13.0');
  console.log('Submitting ' + reviewClaims.length + ' claims from aaa.txt for formal adjudication...');
  console.log('--------------------------------------------------------------------------------\n');

  const results = [];

  for (const item of reviewClaims) {
    console.log('Processing [' + item.id + ']: ' + item.title + '...');
    const state = {
      issue_id: item.id,
      category: item.category,
      target_file: item.targetFile,
      code_snippet: item.codeContext,
      reviewer_claim: item.claim
    };

    const questions = {
      is_ground_truth_flaw: {
        type: 'noul',
        instructions: item.assertion,
        criteria: {
          true: 'Yes, this is an actual verified flaw, bug, vulnerability, or architectural defect in the code.',
          false: 'No, this claim is a false alarm, misunderstanding of design, intentional behavior, or invalid criticism.'
        }
      },
      severity: {
        type: 'choice',
        instructions: 'Given the code context, what is the calibrated severity level of this issue?',
        criteria: {
          critical: 'Critical blocker that prevents core functionality or causes total security bypass.',
          high: 'High severity defect creating operational failure or significant bypass risks.',
          medium: 'Medium severity issue regarding performance, hygiene, edge cases, or observability.',
          low_or_false_alarm: 'Low severity minor polish, false alarm, or debunked criticism.'
        }
      }
    };

    try {
      const response = await callJevSystemOne({
        state,
        questions,
        timeoutMs: 10000
      });

      const noulVal = response.answers?.is_ground_truth_flaw?.noul ?? 0.5;
      const sevChoice = response.answers?.severity?.choice || 'unknown';
      const sevProbs = response.answers?.severity?.probabilities || {};

      const isFlaw = noulVal >= 0.5;

      const record = {
        id: item.id,
        category: item.category,
        title: item.title,
        targetFile: item.targetFile,
        reviewerClaim: item.claim,
        jevNoul: noulVal,
        jevIsFlaw: isFlaw,
        jevSeverity: sevChoice,
        jevSeverityProbabilities: sevProbs,
        model: response.model,
        tokens: response.usage
      };

      results.push(record);
      console.log('  -> Jev Noul (P_flaw): ' + noulVal.toFixed(3) + ' | Classification: ' + (isFlaw ? 'VERIFIED FLAW' : 'FALSE ALARM / DEBUNKED') + ' | Severity: ' + sevChoice);
    } catch (err) {
      console.error('  -> Error querying Jev for [' + item.id + ']: ' + err.message);
      results.push({
        id: item.id,
        error: err.message,
        jevIsFlaw: null
      });
    }
  }

  const outputPath = path.join(__dirname, 'adjudication-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('\n--------------------------------------------------------------------------------');
  console.log('Adjudication complete. Saved ' + results.length + ' results to ' + outputPath);
  console.log('--------------------------------------------------------------------------------');
}

adjudicateAll().catch(err => {
  console.error('Fatal error in adjudication script:', err);
  process.exit(1);
});
