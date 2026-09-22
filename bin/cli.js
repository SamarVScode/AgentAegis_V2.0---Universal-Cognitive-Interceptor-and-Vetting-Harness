#!/usr/bin/env node

/**
 * TypeSafe Aegis CLI Dispatcher (bin/cli.js)
 * When executed via 'npx typesafe-aegis' or 'npx aegis':
 *   - If called without arguments or with 'init' / 'install', installs harness in current directory.
 *   - If called with hook arguments (pre-tool, post-tool, verify-gate), forwards directly to interceptor.
 *   - If called with --help or --version, displays helpful CLI usage information.
 */

import path from 'path';
import { runInstall } from '../harness/install.js';
import { runInterceptor } from '../harness/interceptor.js';
import { verifyAcceptanceGate } from '../harness/acceptance-gate.js';
import { loadSession } from '../harness/cycle-detector.js';
import { isDestructiveAction } from '../harness/jev-client.js';
import { getDecisionSummary, formatDecisionSummary, getDecisionHistory, clearDecisionHistory } from '../harness/decision-tracker.js';

const rawArgs = process.argv.slice(2);
const hookCommands = ['pre-tool', 'preToolUse', 'post-tool', 'postToolUse', 'preExit', 'pre-exit'];
const isHookInvocation = rawArgs.some(arg => hookCommands.includes(arg) || arg === '--engine');

if (isHookInvocation) {
  runInterceptor().catch(err => {
    console.error('Interceptor unexpected error:', err.message);
    console.error(err.stack || '(no stack trace available)');
    process.exit(0);
  });
} else if (rawArgs.some(a => ['decisions', 'tracker', 'audit', 'log'].includes(a))) {
  const cmdIdx = rawArgs.findIndex(a => ['decisions', 'tracker', 'audit', 'log'].includes(a));
  let targetDir = process.cwd();

  const dIdx = rawArgs.findIndex(a => a === '--target-dir' || a === '-d' || a === '--path');
  if (dIdx !== -1 && rawArgs[dIdx + 1] && !rawArgs[dIdx + 1].startsWith('-')) {
    targetDir = rawArgs[dIdx + 1];
  } else if (cmdIdx !== -1 && rawArgs[cmdIdx + 1] && !rawArgs[cmdIdx + 1].startsWith('-')) {
    targetDir = rawArgs[cmdIdx + 1];
  }

  targetDir = path.resolve(targetDir.replace(/^["']|["']$/g, ''));
  const sessionIndex = rawArgs.findIndex(a => a === '--session' || a === '-s');
  const sessionId = sessionIndex !== -1 && rawArgs[sessionIndex + 1] ? rawArgs[sessionIndex + 1].replace(/^["']|["']$/g, '') : null;
  const limitIndex = rawArgs.findIndex(a => a === '--limit' || a === '-n');
  const limit = limitIndex !== -1 && rawArgs[limitIndex + 1] ? parseInt(rawArgs[limitIndex + 1], 10) || 100 : 100;

  if (rawArgs.includes('--clear')) {
    clearDecisionHistory({ targetDir });
    console.log('[AEGIS TRACKER]: Decision audit history cleared.');
    process.exit(0);
  }

  if (rawArgs.includes('--json')) {
    const history = getDecisionHistory({ targetDir, sessionId, limit });
    console.log(JSON.stringify(history, null, 2));
    process.exit(0);
  }

  if (rawArgs.includes('--detail') || rawArgs.includes('--verbose')) {
    const history = getDecisionHistory({ targetDir, sessionId, limit });
    if (history.length === 0) {
      console.log('[AEGIS TRACKER]: No decision records found.');
    } else {
      console.log('======================================================');
      console.log('          AGENTAEGIS DETAILED DECISION LOGS');
      console.log('======================================================');
      for (const dec of history) {
        console.log(`[${dec.passed ? 'PASS' : 'VETO'}] ${dec.decisionType} (${dec.timestamp})`);
        console.log(`  Source       : ${dec.source}`);
        console.log(`  Tool / Input : ${dec.toolName} -> ${dec.inputSummary}`);
        console.log(`  Verdict      : ${dec.verdict} (prob: ${dec.probability ?? 'n/a'}, noul: ${dec.noul ?? 'n/a'})`);
        console.log(`  Reason       : ${dec.reason}`);
        if (dec.metadata?.assertion) {
          console.log(`  Jev Assertion: ${dec.metadata.assertion}`);
        }
        if (dec.metadata?.user_intent) {
          console.log(`  User Intent  : ${dec.metadata.user_intent}`);
        }
        if (dec.metadata?.seven_pillars) {
          const sp = dec.metadata.seven_pillars;
          console.log('  7-Pillars Precision Context:');
          console.log(`    Pillar 1 (Intent)      : ${sp.pillar_1_user_intent || 'None'}`);
          console.log(`    Pillar 2 (Action)      : ${dec.toolName} (OS: ${sp.pillar_2_proposed_action?.runtime_metadata?.platform || process.platform})`);
          if (sp.pillar_3_target_file_ast) {
            console.log(`    Pillar 3 (Target AST)  : ${sp.pillar_3_target_file_ast.slice(0, 100).replace(/\n/g, ' ')}...`);
          }
          if (sp.pillar_4_git_delta) {
            const gd = sp.pillar_4_git_delta;
            console.log(`    Pillar 4 (Git Delta)   :`);
            if (gd.status) console.log(`      Status  : ${gd.status.replace(/\n/g, ', ')}`);
            if (gd.diff_stat) console.log(`      DiffStat: ${gd.diff_stat.replace(/\n/g, ' ')}`);
            if (gd.git_diff) {
              const diffLines = gd.git_diff.slice(0, 400).split('\n').map(l => `        ${l}`).join('\n');
              console.log(`      Unified Diff:\n${diffLines}`);
            }
          }
          if (sp.pillar_5_causal_trajectory) {
            const ct = sp.pillar_5_causal_trajectory;
            const historyCount = Array.isArray(ct.rolling_history) ? ct.rolling_history.length : 0;
            console.log(`    Pillar 5 (Trajectory)  : ${historyCount} prior turn actions in history`);
          }
          if (sp.pillar_6_verification_contract) {
            const vc = sp.pillar_6_verification_contract;
            console.log(`    Pillar 6 (Contract)    : Ecosystem ${vc.ecosystem || 'unknown'} (lastPassed: ${vc.last_test_passed})`);
          }
          if (sp.pillar_7_authorization_boundary) {
            const ab = sp.pillar_7_authorization_boundary;
            console.log(`    Pillar 7 (Auth Boundary): Root '${ab.workspace_root || '.'}'`);
          }
        }
        console.log('------------------------------------------------------');
      }
    }
    process.exit(0);
  }

  const summary = getDecisionSummary({ targetDir, sessionId });
  console.log(formatDecisionSummary(summary));
  process.exit(0);
} else if (rawArgs.includes('verify') || rawArgs.includes('gate') || rawArgs.includes('verify-gate')) {
  const targetDirIndex = rawArgs.indexOf('--target-dir');
  const targetDir = targetDirIndex !== -1 && rawArgs[targetDirIndex + 1] ? rawArgs[targetDirIndex + 1] : process.cwd();
  console.log('[AEGIS VERIFY]: Executing 3-Stage Acceptance Gate on target:', targetDir);
  verifyAcceptanceGate(null, targetDir).then(res => {
    if (res.passed) {
      console.log('[AEGIS VERIFY PASS]: Acceptance gate cleared successfully. Exit code 0.');
      process.exit(0);
    } else {
      console.error(`[AEGIS VERIFY VETO]: Gate rejected at stage '${res.stage}': ${res.reason}`);
      process.exit(1);
    }
  }).catch(err => {
    console.error('[AEGIS VERIFY ERROR]:', err.message);
    process.exit(1);
  });
} else if (rawArgs.includes('check-cycle')) {
  const sessionId = process.env.AEGIS_SESSION_ID || 'default';
  const session = loadSession(sessionId);
  console.log(`[AEGIS CHECK-CYCLE]: Active session '${sessionId}' history entries: ${session.rollingHistory ? session.rollingHistory.length : 0}`);
  console.log(`[AEGIS CHECK-CYCLE]: Status: ${session.tripped ? 'TRIPPED_CYCLE_BREAKER' : 'NOMINAL'}`);
  process.exit(0);
} else if (rawArgs.includes('test:veto')) {
  console.log('[AEGIS TEST:VETO]: Simulating destructive command invocation: rm -rf / --no-preserve-root');
  const destructive = isDestructiveAction('run_command', { CommandLine: 'rm -rf / --no-preserve-root' });
  if (destructive) {
    console.error('[JEV SAFETY VETO]: Destructive command pattern blocked by fastpath filter.');
    console.error('[VETO ENFORCED]: Process terminated with Exit Code 2. Disk untouched.');
    process.exit(2);
  } else {
    console.log('[UNEXPECTED]: Pattern was not detected.');
    process.exit(1);
  }
} else {
  if (rawArgs.includes('--help') || rawArgs.includes('-h') || rawArgs.includes('help')) {
    console.log(`AgentAegis - Universal Cognitive Interceptor & Vetting Harness for Autonomous Coding Agents

Usage:
  aegis [command] [options]
  agent-aegis [command] [options]

Commands:
  install, init         Install hook configurations into current or target workspace
  verify, gate          Run the 3-Stage Acceptance Gate verification pipeline
  check-cycle           Inspect active session history and loop circuit breaker status
  decisions, tracker    Inspect Jev & interceptor cognitive decision audit trail
  test:veto             Simulate a destructive command veto (exits with code 2)

Options:
  --all                 Install hooks for all detected agent ecosystems (Claude, Cursor, Antigravity)
  --claude              Install hooks for Claude Code (.claude/settings.json)
  --cursor              Install rules for Cursor (.cursor/rules/jev-harness.mdc)
  --antigravity         Install hooks for Google Antigravity (.agents/hooks.json)
  --target-dir <path>   Specify target workspace directory (default: current directory)
  --detail, --verbose   Show detailed decision audit with Jev assertion, criteria, and user intent
  --json                Output decisions as raw structured JSON array
  --clear               Clear the persistent decision audit log
  --dry-run             Simulate installation without writing files to disk
  -v, --version         Display package version
  -h, --help            Show this help message
`);
    process.exit(0);
  }

  if (rawArgs.includes('--version') || rawArgs.includes('-v')) {
    console.log('agent-aegis v2.0.0');
    process.exit(0);
  }

  let dryRun = false;
  let targetDir = process.cwd();
  const targets = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === 'init' || arg === 'install') continue;
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--all') targets.push('all');
    else if (arg === '--claude') targets.push('claude');
    else if (arg === '--cursor') targets.push('cursor');
    else if (arg === '--antigravity') targets.push('antigravity');
    else if (arg === '--target-dir' && rawArgs[i + 1]) {
      targetDir = rawArgs[i + 1];
      i++;
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}. Run 'aegis --help' for usage.`);
      process.exit(1);
    }
  }

  try {
    runInstall({ dryRun, targetDir, targets });
  } catch (err) {
    console.error('Installation failed:', err.message);
    process.exit(1);
  }
}
