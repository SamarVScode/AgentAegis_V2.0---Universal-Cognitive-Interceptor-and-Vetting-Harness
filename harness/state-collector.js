/**
 * State Collector (harness/state-collector.js)
 * 7-Pillar Precision Context Envelope Builder & SHA-256 History Hasher.
 * Acquires all 7 context pillars locally in sub-5ms at 0 LLM wire tokens:
 *   P1: User Task Goal & Intent (Claude Code / Antigravity transcript parser)
 *   P2: Proposed Action & Actuator Payload (with runtime environment metadata)
 *   P3: Target Working File AST (virtual shadow buffer / disk content slice)
 *   P4: Workspace Git Delta (git status, diff-stat, unified diff excluding locks)
 *   P5: Causal Trajectory (rolling tool history fingerprints + bounded stderr tail)
 *   P6: Verification Test Contract (detected runner + last_test_passed ground truth)
 *   P7: Authorization Boundary (workspace root directory + allowed scopes)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { detectWorkspaceEcosystem } from './manifest-sniffer.js';

/**
 * Extracts active human prompt from a Claude Code JSONL session transcript.
 * Filters out harness feedback (type: 'tool_result'), subagent turns (isSidechain),
 * and meta entries (isMeta). Clamps to 1,500 characters.
 */
export function extractClaudeCodePrompt(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;

  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
      let entry;
      try { entry = JSON.parse(lines[i]); } catch { continue; }

      // Must be user type
      if (entry.type !== 'user') continue;
      // Skip subagent/sidechain turns
      if (entry.isSidechain) continue;
      // Skip system metadata entries
      if (entry.isMeta) continue;

      const content = entry.message?.content;
      let text = null;

      if (typeof content === 'string') {
        // Plain string = genuine human prompt
        text = content;
      } else if (Array.isArray(content)) {
        // Array containing tool_result = harness feedback, not a user prompt
        if (content.some(b => b.type === 'tool_result')) continue;
        const textBlock = content.find(b => b.type === 'text');
        text = textBlock?.text ?? null;
      }

      if (text) {
        return text.trim().slice(0, 1500);
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Extracts active human prompt from an Antigravity JSONL session transcript.
 * Strips <USER_REQUEST>, <ADDITIONAL_METADATA>, and <USER_SETTINGS_CHANGE> tags.
 * Clamps to 1,500 characters.
 */
export function extractAntigravityPrompt(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;

  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
      let entry;
      try { entry = JSON.parse(lines[i]); } catch { continue; }

      if (entry.type !== 'USER_INPUT' && entry.source !== 'USER_EXPLICIT') continue;

      let text = entry.content || '';

      // Extract content inside <USER_REQUEST> tags if present
      const match = text.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i);
      if (match && match[1]) {
        text = match[1].trim();
      } else {
        // Strip system metadata blocks
        text = text
          .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '')
          .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/gi, '')
          .trim();
      }

      if (text.length > 0) {
        return text.slice(0, 1500);
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Unified Dispatcher: Dispatches to engine-specific parser at 0 wire tokens.
 */
export function extractUserGoal({ engine, transcriptPath, conversationId, cwd } = {}) {
  try {
    if (engine === 'claude' || engine === 'claude-code') {
      return extractClaudeCodePrompt(transcriptPath);
    }

    if (engine === 'antigravity') {
      let agyPath = transcriptPath;
      if (!agyPath || !fs.existsSync(agyPath)) {
        if (conversationId && conversationId !== 'default') {
          agyPath = path.join(
            os.homedir(),
            '.gemini', 'antigravity-cli', 'brain',
            conversationId,
            '.system_generated', 'logs', 'transcript.jsonl'
          );
        }
      }
      return extractAntigravityPrompt(agyPath);
    }

    // Generic engine fallback: try transcriptPath directly if provided
    if (transcriptPath && fs.existsSync(transcriptPath)) {
      const claudePrompt = extractClaudeCodePrompt(transcriptPath);
      if (claudePrompt) return claudePrompt;
      const agyPrompt = extractAntigravityPrompt(transcriptPath);
      if (agyPrompt) return agyPrompt;
    }
  } catch {
    return null;
  }

  return null;
}

export { extractUserGoal as getUserTaskGoal };

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
 * Example: ["replace_file_content:auth.js:sha256(7f8a3c21)"]
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
 * - 'localized': 500 - 1,000 tokens (single file edit)
 * - 'multifile': 1,500 - 2,500 tokens (multiple files modified)
 * - 'failure': 2,000 - 4,000 tokens (build / test failure with compiler stack trace)
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
 * Collects environmental ground truth across all 7 precision context pillars in <20ms.
 * Priority 1: User Task Intent (Pillar 1).
 * Priority 2: Actuator Payload with Runtime Environment Metadata (Pillar 2).
 * Priority 3: Target File AST (Pillar 3).
 * Priority 4: Workspace Git Delta (Pillar 4).
 * Priority 5: Causal Trajectory (Pillar 5).
 * Priority 6: Verification Test Contract (Pillar 6).
 * Priority 7: Authorization Boundary (Pillar 7).
 */
export function collectState(
  taskDescription = '',
  proposedTool = '',
  toolArgs = {},
  conversationId = 'default',
  lastStderr = '',
  scope = null,
  options = {}
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

  // Enrich Pillar 2: Attach runtime environment metadata
  safeArgs.runtime_metadata = {
    platform: process.platform,
    node_version: process.version,
    arch: process.arch,
    ...(options.runtimeMetadata || {})
  };

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

  // Resolve Pillar 1: User Task Intent
  let resolvedTask = (taskDescription || '').trim();
  if (!resolvedTask || resolvedTask === 'Autonomous software engineering task') {
    const extractedGoal = extractUserGoal({
      engine: options.engine,
      transcriptPath: options.transcriptPath,
      conversationId,
      cwd: options.cwd || process.cwd()
    });
    if (extractedGoal) {
      resolvedTask = extractedGoal;
    } else if (!resolvedTask) {
      resolvedTask = 'Autonomous software engineering task';
    }
  }
  resolvedTask = resolvedTask.slice(0, 1500);

  // Resolve Pillar 3: Target File AST (clamped to 1,500 chars)
  const targetFileAst = options.workingFileContent
    ? String(options.workingFileContent).slice(0, 1500)
    : null;

  // Resolve Pillar 5: Causal Trajectory
  const causalTrajectory = {
    rolling_history: compressToolHistory(options.rollingHistory || []),
    stderr_tail: (lastStderr || '').slice(-1200)
  };

  // Resolve Pillar 7: Authorization Boundary
  const authorizationBoundary = options.authorization || {
    workspace_root: process.cwd(),
    allowed_paths: [process.cwd()],
    restricted_patterns: ['rm -rf /', 'git reset --hard', 'DROP DATABASE']
  };

  const workspaceInfo = detectWorkspaceEcosystem(process.cwd());

  const rawState = {
    conversation_id: conversationId,
    task: resolvedTask,
    proposed_tool: proposedTool,
    tool_args: safeArgs,
    target_file_ast: targetFileAst,
    workspace: {
      ecosystem: workspaceInfo.ecosystem,
      package_manager: workspaceInfo.packageManager,
      test_command: workspaceInfo.testCommand,
      last_test_passed: options.lastTestPassed ?? null
    },
    git_status: gitStatus,
    diff_stat: gitDiffStat,
    git_diff: gitDiffApp,
    stderr_tail: (lastStderr || '').slice(-1200),
    causal_trajectory: causalTrajectory,
    authorization_boundary: authorizationBoundary,
    timestamp: new Date().toISOString()
  };

  return buildAdaptiveEnvelope(rawState, determinedScope);
}
