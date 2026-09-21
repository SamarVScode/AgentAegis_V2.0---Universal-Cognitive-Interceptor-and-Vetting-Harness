/**
 * State Collector (harness/state-collector.js)
 * Adaptive Context Envelope Builder (500–1,000 tokens) & SHA-256 History Hasher.
 * Mandated and calibrated by Jev (P=0.77 on adaptive envelope, P=0.72 on focal chunking).
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import { detectWorkspaceEcosystem } from './manifest-sniffer.js';

/**
 * Computes SHA-256 fingerprint for large argument strings or objects.
 */
export function hashArgument(val) {
  if (typeof val !== 'string') {
    try { val = JSON.stringify(val); } catch { val = String(val); }
  }
  return crypto.createHash('sha256').update(val).digest('hex').slice(0, 8);
}

/**
 * Compresses an array of historical tool calls into compact SHA-256 fingerprints.
 * Example: ["replace_file_content:auth.js:SHA256(7f8a3c21)"]
 */
export function compressToolHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history.map(entry => {
    if (typeof entry === 'string') return entry;
    const tool = entry.tool || entry.proposed_tool || entry.name || 'tool';
    const target = entry.targetFile || entry.file_path || entry.target || entry.path || '';
    const argsStr = JSON.stringify(entry.args || entry.tool_args || {});
    const hash = crypto.createHash('sha256').update(argsStr).digest('hex').slice(0, 8);
    return `${tool}:${target ? target + ':' : ''}sha256(${hash})`;
  });
}

/**
 * Builds an adaptive context envelope sized according to the operation scope.
 * Scopes:
 * - 'localized': 500 – 1,000 tokens (single file edit)
 * - 'multifile': 1,500 – 2,500 tokens (multiple files modified)
 * - 'failure': 2,000 – 4,000 tokens (build / test failure with compiler stack trace)
 */
export function buildAdaptiveEnvelope(rawState, scope = 'localized') {
  let diffLimit = 1500;
  let stderrLimit = 800;
  let statusLimit = 600;

  switch (scope) {
    case 'failure':
      diffLimit = 2500;
      stderrLimit = 2500;
      statusLimit = 1000;
      break;
    case 'multifile':
      diffLimit = 2500;
      stderrLimit = 1000;
      statusLimit = 800;
      break;
    case 'localized':
    default:
      diffLimit = 1200;
      stderrLimit = 600;
      statusLimit = 500;
      break;
  }

  const envelope = { ...rawState };

  if (typeof envelope.git_diff === 'string' && envelope.git_diff.length > diffLimit) {
    envelope.git_diff = envelope.git_diff.slice(0, diffLimit) + '\n... [git diff truncated for token envelope]';
  }

  if (typeof envelope.stderr_tail === 'string' && envelope.stderr_tail.length > stderrLimit) {
    envelope.stderr_tail = envelope.stderr_tail.slice(-stderrLimit) + '\n... [stderr tail bounded]';
  }

  if (typeof envelope.git_status === 'string' && envelope.git_status.length > statusLimit) {
    envelope.git_status = envelope.git_status.slice(0, statusLimit) + '\n... [status truncated]';
  }

  return envelope;
}

/**
 * Collects environmental ground truth in <50ms.
 * Priority 1: Unified Git Diff hunks (excluding lockfiles).
 * Priority 2: Compiler Stderr / terminal output.
 * Priority 3: Task Intent.
 * Priority 4: SHA-256 historical fingerprints.
 */
export function collectState(
  taskDescription = '',
  proposedTool = '',
  toolArgs = {},
  conversationId = 'default',
  lastStderr = '',
  scope = null
) {
  let gitStatus = '';
  let gitDiffStat = '';
  let gitDiffApp = '';
  const MAX_BUFFER = 10 * 1024 * 1024;
  const MAX_LINES = 50;

  try {
    const rawStatus = execSync('git status --porcelain', {
      encoding: 'utf8',
      timeout: 2000,
      maxBuffer: MAX_BUFFER,
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    if (rawStatus) {
      const statusLines = rawStatus.split('\n').filter(Boolean);
      if (statusLines.length > MAX_LINES) {
        gitStatus = statusLines.slice(0, MAX_LINES).join('\n') + `\n... [${statusLines.length - MAX_LINES} more status lines truncated]`;
      } else {
        gitStatus = rawStatus;
      }
    }

    const rawDiffStat = execSync('git diff --stat', {
      encoding: 'utf8',
      timeout: 2000,
      maxBuffer: MAX_BUFFER,
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    if (rawDiffStat) {
      const diffStatLines = rawDiffStat.split('\n').filter(Boolean);
      if (diffStatLines.length > MAX_LINES) {
        gitDiffStat = diffStatLines.slice(0, MAX_LINES).join('\n') + `\n... [${diffStatLines.length - MAX_LINES} more diff-stat lines truncated]`;
      } else {
        gitDiffStat = rawDiffStat;
      }
    }

    // Exclude package lockfiles and capture top 40 lines
    gitDiffApp = execSync('git diff -U2 -- ":!package-lock.json" ":!yarn.lock" ":!pnpm-lock.yaml" ":!poetry.lock"', {
      encoding: 'utf8',
      timeout: 2000,
      maxBuffer: MAX_BUFFER,
      stdio: ['pipe', 'pipe', 'ignore']
    })
      .split('\n')
      .slice(0, 40)
      .join('\n')
      .trim();
  } catch {}

  // Truncate massive argument values with SHA-256 fingerprints
  const safeArgs = {};
  if (toolArgs && typeof toolArgs === 'object') {
    for (const [key, val] of Object.entries(toolArgs)) {
      if (typeof val === 'string' && val.length > 600) {
        const hash = hashArgument(val);
        safeArgs[key] = `${val.slice(0, 250)}\n... [truncated for vetting, sha256:${hash}]`;
      } else {
        safeArgs[key] = val;
      }
    }
  }

  // Infer scope if not explicitly provided
  let determinedScope = scope;
  if (!determinedScope) {
    if (lastStderr && lastStderr.trim().length > 0) {
      determinedScope = 'failure';
    } else {
      const modifiedFilesCount = gitStatus
        .split('\n')
        .filter(l => Boolean(l) && !l.startsWith('...'))
        .length;
      determinedScope = modifiedFilesCount > 1 ? 'multifile' : 'localized';
    }
  }

  const workspaceInfo = detectWorkspaceEcosystem(process.cwd());

  const rawState = {
    conversation_id: conversationId,
    task: (taskDescription || 'Autonomous software engineering task').slice(0, 800),
    proposed_tool: proposedTool,
    tool_args: safeArgs,
    workspace: {
      ecosystem: workspaceInfo.ecosystem,
      package_manager: workspaceInfo.packageManager,
      test_command: workspaceInfo.testCommand
    },
    git_status: gitStatus,
    diff_stat: gitDiffStat,
    git_diff: gitDiffApp,
    stderr_tail: (lastStderr || '').slice(-1200),
    timestamp: new Date().toISOString()
  };

  return buildAdaptiveEnvelope(rawState, determinedScope);
}
