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

const rawArgs = process.argv.slice(2);
const hookCommands = ['pre-tool', 'preToolUse', 'post-tool', 'postToolUse', 'verify-gate', 'preExit', 'pre-exit'];
const isHookInvocation = rawArgs.some(arg => hookCommands.includes(arg) || arg === '--engine');

if (isHookInvocation) {
  runInterceptor().catch(err => {
    console.error('Interceptor unexpected error:', err.message);
    console.error(err.stack || '(no stack trace available)');
    process.exit(0);
  });
} else {
  if (rawArgs.includes('--help') || rawArgs.includes('-h') || rawArgs.includes('help')) {
    console.log(`AgentAegis - Universal Cognitive Interceptor & Vetting Harness for Autonomous Coding Agents

Usage:
  aegis [options]
  agent-aegis [options]

Commands:
  install, init         Install hook configurations into current or target workspace

Options:
  --all                 Install hooks for all detected agent ecosystems (Claude, Cursor, Antigravity)
  --claude              Install hooks for Claude Code (.claude/settings.json)
  --cursor              Install rules for Cursor (.cursor/rules/jev-harness.mdc)
  --antigravity         Install hooks for Google Antigravity (.agents/hooks.json)
  --target-dir <path>   Specify target workspace directory (default: current directory)
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
