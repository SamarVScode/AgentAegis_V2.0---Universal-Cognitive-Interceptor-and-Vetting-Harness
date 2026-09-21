#!/usr/bin/env node

/**
 * Universal Lifecycle Interceptor Coordinator (harness/interceptor.js)
 * Coordinates preToolUse, postToolUse, and preExit lifecycle hooks.
 * Integrates:
 *   - sensitive-guard.js (Fastpath & exfiltration guard)
 *   - core-laws-linter.js (Universal code invariant linter)
 *   - cycle-detector.js (3 vs 5 thrashing circuit breaker + virtual shadow buffer)
 *   - state-collector.js (Adaptive context envelope)
 *   - jev-client.js (Native fetch client & bipartite fail-safe)
 *   - acceptance-gate.js (Deterministic runner parser & Jev completion gate)
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { collectState } from './state-collector.js';
import { checkCycle, clearHistory, loadSession, saveSession, reconstructShadowBuffer } from './cycle-detector.js';
import { isDestructiveAction, jevBooleanCheck } from './jev-client.js';
import { evaluatePathSecurity, isReadInspectionTool, inspectCommandForSensitivePaths } from './sensitive-guard.js';
import { lintCoreLaws, formatCoreLawsReport } from './core-laws-linter.js';
import { verifyAcceptanceGate } from './acceptance-gate.js';
import { recordDecision } from './decision-tracker.js';

const rawArgs = process.argv.slice(2);
const engineIdx = rawArgs.indexOf('--engine');
const engine = engineIdx !== -1 ? rawArgs[engineIdx + 1] : (process.stdin.isTTY ? 'claude' : 'antigravity');
const cleanArgs = rawArgs.filter((_, i) => i !== engineIdx && i !== engineIdx + 1);

const [mode = 'pre-tool', arg1, arg2] = cleanArgs;

// Helper to parse JSON with auto-stripping of shell single-quotes and resilient fallback
export function safeParseJson(raw) {
  if (!raw) return {};
  const rawInput = String(raw).trim();
  if (!rawInput) return {};

  let cleaned = rawInput;
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Strip control and binary non-printable characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  // 1. Direct standard parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2. Fix trailing commas (e.g. {"a": 1, "b": 2,})
  try {
    const fixed = cleaned.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(fixed);
  } catch {}

  // 3. Fix single-quoted JSON (e.g. {'a': 'val', 'b': 2})
  try {
    const fixed = cleaned.replace(/'/g, '"');
    return JSON.parse(fixed);
  } catch {}

  // 4. Extract embedded JSON object substring if surrounded by raw text/noise
  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        const fixed = jsonMatch[0].replace(/,\s*([}\]])/g, '$1').replace(/'/g, '"');
        return JSON.parse(fixed);
      }
    }
  } catch {}

  // 5. Unquoted keys and comma-delimited key-value fallback
  try {
    if (cleaned.includes(':')) {
      const obj = {};
      for (const part of cleaned.split(',')) {
        const lastColon = part.lastIndexOf(':');
        if (lastColon !== -1) {
          const val = part.slice(lastColon + 1).trim().replace(/^['"]|['"]$/g, '');
          const beforeColon = part.slice(0, lastColon).trim();
          const keyMatch = beforeColon.match(/([a-zA-Z0-9_]+)$/);
          if (keyMatch) {
            obj[keyMatch[1]] = val;
          }
        }
      }
      if (Object.keys(obj).length > 0) return obj;
    }
  } catch {}

  return {};
}

// Event-driven stdin stream reader with Windows grace timeout & chunk inactivity handling (Fix 4 & 5)
export async function readStdinJson(timeoutMs = null) {
  if (process.stdin.isTTY) return {};
  const defaultTimeout = parseInt(process.env.AEGIS_STDIN_TIMEOUT_MS, 10) || 500;
  const effectiveTimeout = timeoutMs || defaultTimeout;

  return new Promise((resolve) => {
    let data = '';
    let resolved = false;
    let timer = null;

    const finish = (result) => {
      if (!resolved) {
        resolved = true;
        if (timer) clearTimeout(timer);
        try { process.stdin.pause(); } catch {}
        resolve(result);
      }
    };

    const processPayload = (rawStr) => {
      const parsed = safeParseJson(rawStr);
      if (rawStr && rawStr.trim() && Object.keys(parsed).length === 0) {
        if (isDestructiveAction('run_command', { CommandLine: rawStr })) {
          globalThis.__currentOperationDestructive = true;
          console.error(`[JEV SAFETY VETO]: Raw input blocked by safety filter: Destructive pattern detected in unparsed payload.`);
          process.exit(2);
        }
      }
      return parsed;
    };

    const resetTimer = (delay) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        finish(processPayload(data));
      }, delay);
    };

    resetTimer(effectiveTimeout);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
      // When chunks arrive, reset inactivity timer to allow incoming payload streaming
      resetTimer(300);
    });
    process.stdin.on('end', () => {
      finish(processPayload(data));
    });
    process.stdin.on('error', () => {
      finish({});
    });
  });
}

/**
 * Main lifecycle dispatcher
 */
export async function runInterceptor() {
  const cwdHash = createHash('sha256').update(process.cwd()).digest('hex').slice(0, 8);
  let sessionFromFile = null;
  try {
    const sessionFilePath = path.join(process.cwd(), '.aegis-session');
    if (fs.existsSync(sessionFilePath)) {
      sessionFromFile = fs.readFileSync(sessionFilePath, 'utf8').trim() || null;
    }
  } catch {}
  // Read stdin once before mode dispatch so session_id can be extracted.
  // Each mode branch receives stdinPayload directly to avoid consuming stdin twice.
  const stdinPayload = await readStdinJson();
  // stdinPayload.session_id is stable across all Claude Code hook invocations
  // (PreToolUse, PostToolUse, Stop) in one session. Eliminates ppid fragmentation.
  const sessionId = process.env.AEGIS_SESSION_ID ||
                    stdinPayload.session_id ||
                    process.env.CONVERSATION_ID ||
                    process.env.CLAUDE_CONVERSATION_ID ||
                    process.env.CURSOR_SESSION_ID ||
                    sessionFromFile ||
                    (`cwd-${cwdHash}`);

  // -------------------------------------------------------------------------
  // HOOK 1: PRE-TOOL USE
  // -------------------------------------------------------------------------
  if (mode === 'pre-tool' || mode === 'preToolUse') {
    let toolName = '';
    let toolArgs = {};

    if (engine === 'antigravity') {
      const stdinData = stdinPayload;
      toolName = stdinData.toolCall?.name || stdinData.name || '';
      toolArgs = stdinData.toolCall?.args || stdinData.args || {};
    } else if (engine === 'claude' || engine === 'claude-code') {
      const stdinData = stdinPayload;
      if (stdinData.tool_name) {
        // Stdin envelope from Claude Code hook runtime
        toolName = stdinData.tool_name;
        toolArgs = stdinData.tool_input || {};
      } else {
        // CLI fallback (tests, direct invocation)
        toolName = arg1 || '';
        if (arg2) {
          toolArgs = safeParseJson(arg2);
          if (arg2.trim() && Object.keys(toolArgs).length === 0) {
            if (isDestructiveAction('run_command', { CommandLine: arg2 })) {
              console.error(`[JEV SAFETY VETO]: Raw input blocked by safety filter: Destructive pattern detected in payload.`);
              process.exit(2);
            }
          }
        } else {
          toolArgs = Object.keys(stdinData).length > 0 ? stdinData : {};
        }
      }
    } else if (engine === 'cursor') {
      const stdinData = stdinPayload;
      if (stdinData.name) {
        // Stdin envelope from Cursor hook runtime
        toolName = stdinData.name;
        toolArgs = stdinData.arguments || {};
      } else {
        // CLI fallback
        toolName = arg1 || '';
        toolArgs = arg2 ? safeParseJson(arg2) : (Object.keys(stdinData).length > 0 ? stdinData : {});
      }
    } else {
      toolName = arg1 || '';
      if (arg2) {
        toolArgs = safeParseJson(arg2);
        if (arg2.trim() && Object.keys(toolArgs).length === 0) {
          if (isDestructiveAction('run_command', { CommandLine: arg2 })) {
            console.error(`[JEV SAFETY VETO]: Raw input blocked by safety filter: Destructive pattern detected in payload.`);
            process.exit(2);
          }
        }
      } else {
        const stdinData = stdinPayload;
        toolArgs = Object.keys(stdinData).length > 0 ? stdinData : {};
      }
    }

    const targetFile = toolArgs.TargetFile || toolArgs.file_path || toolArgs.path || toolArgs.target || toolArgs.AbsolutePath || '';
    const newContent = toolArgs.CodeContent || toolArgs.ReplacementContent || toolArgs.content || toolArgs.code || '';

    // Virtual whole-file buffer reconstruction for replace_file_content (Fix 3)
    let wholeFileContent = newContent;
    if (toolName === 'replace_file_content' || toolName.includes('replace')) {
      wholeFileContent = reconstructShadowBuffer(
        targetFile,
        toolArgs.TargetContent || '',
        toolArgs.ReplacementContent || '',
        sessionId
      );
    } else if (toolName === 'write_to_file' || toolName.includes('write')) {
      wholeFileContent = newContent;
    }

    // Check if operation is destructive and set global flag for fail-closed error handling
    const isDestructive = isDestructiveAction(toolName, toolArgs);
    if (isDestructive) {
      globalThis.__currentOperationDestructive = true;
    }

    // Generic command credential-exfiltration check (Issue 4 mitigation)
    const cmdStr = (toolArgs.command || toolArgs.CommandLine || toolArgs.cmd || toolArgs.script || '').toString();
    if (cmdStr) {
      const sensitiveInCmd = inspectCommandForSensitivePaths(cmdStr);
      if (sensitiveInCmd.isSensitive) {
        const secResult = await evaluatePathSecurity('run_command', cmdStr, process.env.TASK_DESCRIPTION, true);
        if (!secResult.approved) {
          recordDecision({
            sessionId,
            source: 'sensitive_guard',
            decisionType: 'security_exfiltration_veto',
            toolName,
            inputSummary: cmdStr,
            passed: false,
            verdict: 'vetoed',
            reason: secResult.reason
          });
          console.error(secResult.reason);
          process.exit(2);
        }
      }
    }

    // Step 1: Sensitive Credential Read Guard (Layer 1 Fastpath vs Layer 2 Security)
    if (isReadInspectionTool(toolName)) {
      const secResult = await evaluatePathSecurity(toolName, targetFile, process.env.TASK_DESCRIPTION);
      if (secResult.fastpath) {
        // Fastpath approved: 0 tokens, 0ms latency
        process.exit(0);
      }
      if (!secResult.approved) {
        recordDecision({
          sessionId,
          source: 'sensitive_guard',
          decisionType: 'credential_read_veto',
          toolName,
          inputSummary: targetFile,
          passed: false,
          verdict: 'vetoed',
          reason: secResult.reason
        });
        console.error(secResult.reason);
        process.exit(2); // Hard exit 2 veto
      }
    }

    // Step 2: Diff Variance Cycle Detector & Thrashing Circuit Breaker (Universal)
    const cycle = checkCycle(toolName, targetFile, wholeFileContent, sessionId);
    if (cycle.isThrashing) {
      recordDecision({
        sessionId,
        source: 'cycle_detector',
        decisionType: 'cycle_thrash_veto',
        toolName,
        inputSummary: `${targetFile} (diff hash: ${cycle.diffHash || 'unknown'})`,
        passed: false,
        verdict: 'vetoed',
        reason: cycle.critique
      });
      console.error(cycle.critique);
      process.exit(2); // Hard block repetitive thrashing
    }
    if (cycle.warning && cycle.critique) {
      console.error(cycle.critique);
    }

    // Step 3: Universal Code Invariants Linter
    if (wholeFileContent && (toolName.includes('write') || toolName.includes('replace') || toolName.includes('edit'))) {
      const lintResult = lintCoreLaws(wholeFileContent, targetFile);
      if (!lintResult.clean) {
        recordDecision({
          sessionId,
          source: 'core_laws_linter',
          decisionType: 'code_invariant_violation',
          toolName,
          inputSummary: targetFile,
          passed: false,
          verdict: 'vetoed',
          reason: `Violated ${lintResult.violations.length} core law(s)`
        });
        console.error(formatCoreLawsReport(lintResult.violations));
        process.exit(2); // Hard block universal code invariant violation
      }
    }

    // Step 4: Destructive Side-Effect Vetting via Jev System One (Isolated fail-closed guard)
    if (isDestructive) {
      try {
        const state = collectState(process.env.TASK_DESCRIPTION, toolName, toolArgs, sessionId, '', 'localized');
        const jevCheck = await jevBooleanCheck({
          state,
          assertion: 'Is this operation safe to proceed without risking irrecoverable data loss, database destruction, or repository corruption?',
          criteriaTrue: 'The operation is safe, intentional, and standard for the task.',
          criteriaFalse: 'The operation risks catastrophic data loss, database drops, hard git resets, or directory wipes.',
          isDestructive: true
        });

        recordDecision({
          sessionId,
          source: 'jev_system_one',
          decisionType: 'destructive_vetting',
          toolName,
          inputSummary: cmdStr || targetFile || toolName,
          passed: jevCheck.approved,
          verdict: jevCheck.approved ? 'approved' : 'vetoed',
          noul: jevCheck.noul,
          probability: jevCheck.probability,
          reason: jevCheck.reason
        });

        if (!jevCheck.approved) {
          console.error(`[JEV SAFETY VETO]: Operation '${toolName}' blocked by Jev safety filter: ${jevCheck.reason || 'High risk of destructive data loss.'}`);
          process.exit(2);
        }
      } catch (vetErr) {
        recordDecision({
          sessionId,
          source: 'jev_system_one',
          decisionType: 'destructive_vetting_error',
          toolName,
          inputSummary: cmdStr || targetFile || toolName,
          passed: false,
          verdict: 'vetoed',
          reason: `Vetting error: ${vetErr.message}. Enforcing hard fail-closed.`
        });
        console.error(`[JEV SAFETY VETO]: Error occurred during destructive vetting for '${toolName}': ${vetErr.message}. Enforcing hard fail-closed.`);
        process.exit(2);
      }
    }

    // Approved to proceed
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // HOOK 2: POST-TOOL USE
  // -------------------------------------------------------------------------
  if (mode === 'post-tool' || mode === 'postToolUse') {
    const stdinData = stdinPayload;
    const isError = stdinData.isError || stdinData.error;
    const stderr = stdinData.stderr || (isError ? String(stdinData.output || '') : '');

    if (stderr) {
      // Store last stderr in session for adaptive failure enveloping
      const session = loadSession(sessionId);
      session.lastStderr = stderr.slice(-1500);
      saveSession(session, sessionId);
    }

    const TEST_RUNNER_PATTERN = /^(npm|yarn|pnpm|bun)\s+test|pytest|cargo\s+test|go\s+test|node\s+.*test|gradlew\s+test/i;
    const TEST_OUTPUT_FAIL_MARKERS = /passing|failing|failed|PASSED|FAILED|tests?\s+passed|test suite|AssertionError|FAIL\b/i;

    if (stdinData.tool_name === 'Bash') {
      const cmd = stdinData.tool_input?.command || '';
      const output = stdinData.tool_result?.output || '';
      const toolIsError = stdinData.tool_result?.is_error;

      if (TEST_RUNNER_PATTERN.test(cmd)) {
        const testSession = loadSession(sessionId);
        if (toolIsError === true && TEST_OUTPUT_FAIL_MARKERS.test(output)) {
          // Genuine test failure with test output - not a timeout or spawn error
          testSession.lastTestPassed = false;
          saveSession(testSession, sessionId);
          recordDecision({
            sessionId,
            source: 'test_runner',
            decisionType: 'post_tool_test_tracking',
            toolName: 'Bash',
            inputSummary: cmd,
            passed: false,
            verdict: 'failed',
            reason: 'Test runner exited with failure markers'
          });
        } else if (toolIsError === false) {
          // Clean exit - tests passed
          testSession.lastTestPassed = true;
          saveSession(testSession, sessionId);
          recordDecision({
            sessionId,
            source: 'test_runner',
            decisionType: 'post_tool_test_tracking',
            toolName: 'Bash',
            inputSummary: cmd,
            passed: true,
            verdict: 'passed',
            reason: 'Test runner exited cleanly with code 0'
          });
        }
      }
    }

    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // HOOK 3: VERIFY GATE / PRE-EXIT
  // -------------------------------------------------------------------------
  if (mode === 'verify-gate' || mode === 'preExit' || mode === 'pre-exit') {
    const stdinData = stdinPayload;
    const customCmd = arg1 || stdinData.command || stdinData.customCommand || null;
    const agentStatement = stdinData.statement || stdinData.message || stdinData.final_response || arg2 || null;
    const gateResult = await verifyAcceptanceGate(customCmd, process.cwd(), agentStatement, sessionId);

    recordDecision({
      sessionId,
      source: 'acceptance_gate',
      decisionType: gateResult.stage || 'acceptance_gate',
      toolName: 'verifyAcceptanceGate',
      inputSummary: agentStatement || customCmd || 'completion check',
      passed: gateResult.passed,
      verdict: gateResult.passed ? 'passed' : 'vetoed',
      reason: gateResult.reason,
      probability: gateResult.probability,
      metadata: { exitCode: gateResult.exitCode, testsRun: gateResult.testsRun }
    });

    if (gateResult.passed) {
      console.error(`\n======================================================`);
      console.error(`[JEV ACCEPTANCE GATE]: Verification Passed (${gateResult.reason})`);
      console.error(`======================================================\n`);
      process.exit(0);
    } else {
      console.error(`\n======================================================`);
      console.error(`[JEV ACCEPTANCE GATE REJECTED]: ${gateResult.reason}`);
      console.error(`Exit Code: ${gateResult.exitCode ?? 'none'} | Tests Run: ${gateResult.testsRun ?? 'none'}`);
      console.error(`Agent completion halted. Resolve failing tests before terminating.`);
      console.error(`======================================================\n`);
      process.exit(2); // Veto termination
    }
  }

  // Default passthrough
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('interceptor.js')) {
  runInterceptor().catch(err => {
    console.error('Interceptor unexpected error:', err.message);
    console.error(err.stack || '(no stack trace available)');
    if (mode === 'pre-tool' || mode === 'preToolUse' || mode === 'verify-gate' || mode === 'preExit' || mode === 'pre-exit' || globalThis.__currentOperationDestructive || rawArgs.some(a => isDestructiveAction('run_command', { CommandLine: a }))) {
      console.error('[JEV SAFETY VETO]: Interceptor unhandled error during critical lifecycle gate. Hard fail-closed enforced (exit 2).');
      process.exit(2);
    }
    process.exit(0); // Fail open gracefully on internal unexpected error for benign post-tool telemetry
  });
}
