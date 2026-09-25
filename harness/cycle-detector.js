/**
 * Cycle Detector & Thrashing Circuit Breaker (harness/cycle-detector.js)
 * Multi-pattern loop detection (consecutive, oscillating, triangular) with diff variance integration.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { classifyEditVariance } from './diff-variance.js';

let lastPruneTime = 0;

export const SUPERVISOR_POLL_TOOLS = new Set([
  'manage_subagents',
  'manage_task',
  'list_subagents',
  'task_status'
]);

export function getSessionPaths(sessionId = 'default') {
  const sanitizedId = (sessionId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(os.homedir(), '.aegis-harness', sanitizedId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return {
    dir,
    stateFile: path.join(dir, 'session.json'),
    tmpFile: path.join(dir, `session.json.tmp.${process.pid}`),
    shadowDir: path.join(dir, 'shadow')
  };
}

export function getShadowPaths(sessionId = 'default', targetFile = '') {
  const { shadowDir } = getSessionPaths(sessionId);
  if (!fs.existsSync(shadowDir)) fs.mkdirSync(shadowDir, { recursive: true });

  const sanitizedFileName = (targetFile || 'unnamed')
    .replace(/^([a-zA-Z]:)?[\\/]/, '')
    .replace(/[^a-zA-Z0-9_.-]/g, '_');

  return {
    shadowDir,
    shadowFile: path.join(shadowDir, sanitizedFileName)
  };
}

/**
 * Reconstructs virtual whole-file buffer in memory and caches shadow copy under .jev/<sessionId>/shadow/
 */
export function reconstructShadowBuffer(targetFile = '', targetContent = '', replacementContent = '', sessionId = 'default') {
  if (!targetFile) return replacementContent || '';

  const { shadowFile } = getShadowPaths(sessionId, targetFile);

  // Read previous buffer: prefer existing shadow copy, then disk file, then fallback
  let baseContent = '';
  if (fs.existsSync(shadowFile)) {
    try {
      baseContent = fs.readFileSync(shadowFile, 'utf8');
    } catch {}
  } else if (fs.existsSync(targetFile)) {
    try {
      baseContent = fs.readFileSync(targetFile, 'utf8');
    } catch {}
  }

  let reconstructed = baseContent;
  reconstructed = reconstructed.replace(/\r\n/g, '\n');
  targetContent = (targetContent || '').replace(/\r\n/g, '\n');
  replacementContent = (replacementContent || '').replace(/\r\n/g, '\n');

  if (targetContent) {
    if (reconstructed.includes(targetContent)) {
      reconstructed = reconstructed.replace(targetContent, replacementContent);
    } else {
      return baseContent;
    }
  } else if (replacementContent) {
    reconstructed = reconstructed ? `${reconstructed}\n${replacementContent}` : replacementContent;
  }

  // Cache updated shadow buffer
  try {
    fs.writeFileSync(shadowFile, reconstructed, 'utf8');
  } catch {}

  return reconstructed;
}

/**
 * Prunes old session directories from .jev/
 */
export function pruneOldSessions(maxSessions = 20, maxAgeHours = 48, baseDir = null) {
  if (Date.now() - lastPruneTime < 60000) return;
  lastPruneTime = Date.now();
  try {
    const jevDir = baseDir || path.join(os.homedir(), '.aegis-harness');
    if (!fs.existsSync(jevDir)) return;

    const entries = fs.readdirSync(jevDir, { withFileTypes: true });
    const sessionDirs = [];
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = path.join(jevDir, entry.name);
      try {
        const stats = fs.statSync(dirPath);
        const statePath = path.join(dirPath, 'session.json');
        let mtimeMs = stats.mtimeMs;
        if (fs.existsSync(statePath)) {
          try {
            mtimeMs = Math.max(mtimeMs, fs.statSync(statePath).mtimeMs);
          } catch {}
        }
        sessionDirs.push({ name: entry.name, path: dirPath, mtimeMs });
      } catch {}
    }

    sessionDirs.sort((a, b) => b.mtimeMs - a.mtimeMs);

    sessionDirs.forEach((dirInfo, index) => {
      const isExpired = (now - dirInfo.mtimeMs) > maxAgeMs;
      const isExcess = index >= maxSessions;
      if (isExpired || isExcess) {
        try {
          fs.rmSync(dirInfo.path, { recursive: true, force: true });
        } catch {}
      }
    });
  } catch {}
}

export function loadSession(sessionId = 'default') {
  pruneOldSessions();
  const { stateFile } = getSessionPaths(sessionId);
  let session = { rollingHistory: [], fileEditSnapshots: {} };

  if (fs.existsSync(stateFile)) {
    try {
      const raw = fs.readFileSync(stateFile, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        session = {
          ...data,
          rollingHistory: Array.isArray(data.rollingHistory) ? data.rollingHistory : [],
          fileEditSnapshots: data.fileEditSnapshots && typeof data.fileEditSnapshots === 'object'
            ? data.fileEditSnapshots
            : {}
        };
      }
    } catch {}
  }
  return session;
}

export function saveSession(session, sessionId = 'default') {
  pruneOldSessions();
  const { stateFile, tmpFile } = getSessionPaths(sessionId);
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(session, null, 2), 'utf8');
    fs.renameSync(tmpFile, stateFile);
  } catch {}
}

/**
 * Checks for unproductive cycles and thrashing loops.
 * Integrates diff variance:
 * - Trivial churn (<15% variance): Hard breaker trips at 3 repeats.
 * - Substantive edits (>=15% variance): Breaker allows up to 5 repeats.
 */
export function checkCycle(toolName = '', targetFile = '', currentContentOrDiff = '', sessionId = 'default') {
  const session = loadSession(sessionId);
  const key = `${toolName}:${targetFile || ''}`;

  // Analyze diff variance for file mutations
  const prevSnapshot = session.fileEditSnapshots[targetFile] || '';
  const editClassification = classifyEditVariance(prevSnapshot, currentContentOrDiff || '');

  // Update snapshot if content is provided
  if (currentContentOrDiff && targetFile) {
    session.fileEditSnapshots[targetFile] = String(currentContentOrDiff).slice(0, 25000);
  }

  session.rollingHistory.push({
    key,
    tool: toolName,
    targetFile,
    variance: editClassification.variance,
    timestamp: Date.now()
  });

  // Rolling window of 20 entries
  if (session.rollingHistory.length > 20) {
    session.rollingHistory = session.rollingHistory.slice(-20);
  }

  saveSession(session, sessionId);

  const history = session.rollingHistory;
  const len = history.length;

  // Calculate repeatCount and allowed
  const allowed = editClassification.allowedRepeats; // 3 if <0.15, 5 if >=0.15
  let repeatCount = 1;

  if (targetFile) {
    let count = 0;
    for (let i = len - 1; i >= 0; i--) {
      if (history[i].targetFile === targetFile) {
        count++;
      } else {
        break; // break consecutive chain
      }
    }
    repeatCount = count;
  } else {
    let count = 0;
    for (let i = len - 1; i >= 0; i--) {
      if (history[i].key === key) {
        count++;
      } else {
        break;
      }
    }
    repeatCount = count;
  }

  // 1. Check Consecutive Edits on the same file with diff variance
  if (targetFile && len >= 2) {
    if (repeatCount >= allowed) {
      const critique = `[JEV CYCLE VETO]: You have modified '${targetFile}' ${repeatCount} consecutive times with ` +
        `${editClassification.category === 'trivial_churn' ? '<15% diff variance (trivial churn)' : 'unresolved test failures'}.\n` +
        `Root Cause: Localized code thrashing on '${targetFile}'.\n` +
        `Required Action: Cease editing '${targetFile}'. Inspect caller stack traces, unit tests, or related dependencies.`;

      return {
        isThrashing: true,
        reason: editClassification.category === 'trivial_churn' ? 'trivial_diff_churn' : 'consecutive_file_thrashing',
        repeatCount,
        allowedRepeats: allowed,
        variance: editClassification.variance,
        critique
      };
    } else if (repeatCount === 2 && editClassification.category === 'trivial_churn') {
      const critique = `[JEV CYCLE WARNING]: You have modified '${targetFile}' 2 consecutive times with <15% diff variance (trivial churn).\n` +
        `Warning: Hard circuit breaker will trip on the 3rd repetition if substantive changes are not made.\n` +
        `Recommended Action: Re-assess approach, examine test outputs or logs instead of repetitive minor edits.`;

      return {
        isThrashing: false,
        warning: true,
        reason: 'trivial_churn_warning',
        repeatCount: 2,
        allowedRepeats: allowed,
        variance: editClassification.variance,
        critique
      };
    }
  }

  // 1b. Supervisor polling cycle breaker (warn at 3, veto at 5)
  if (SUPERVISOR_POLL_TOOLS.has(toolName)) {
    if (repeatCount >= 5) {
      return {
        isThrashing: true,
        reason: 'supervisor_polling_veto',
        repeatCount,
        allowedRepeats: 5,
        critique: `[JEV SUPERVISOR VETO]: Tool '${toolName}' polled ${repeatCount} times consecutively. Halt active polling loops immediately. Rely on reactive notifications or schedule timers.`
      };
    } else if (repeatCount === 3) {
      return {
        isThrashing: false,
        warning: true,
        reason: 'supervisor_polling_warning',
        repeatCount,
        allowedRepeats: 5,
        critique: `[JEV SUPERVISOR WARNING]: Tool '${toolName}' polled 3 times consecutively. Cease active polling loops. Rely on reactive notifications instead of burning compounding context tokens.`
      };
    }
  }

  // 2. Direct consecutive identical actions for tools without a targetFile (e.g. repeated identical commands)
  if (!targetFile && len >= 3 && !SUPERVISOR_POLL_TOOLS.has(toolName)) {
    const prev1 = history[len - 2]?.key;
    const prev2 = history[len - 3]?.key;
    if (prev1 === key && prev2 === key) {
      return {
        isThrashing: true,
        reason: 'consecutive_identical_tool',
        repeatCount: 3,
        critique: `[JEV CYCLE VETO]: Tool '${toolName}' invoked 3 times consecutively with identical target '${targetFile}'. Halt thrashing and re-evaluate approach.`
      };
    }
  }

  // 3. Oscillating ping-pong cycle detection (A -> B -> A -> B)
  if (len >= 4) {
    const a1 = history[len - 1]?.key;
    const b1 = history[len - 2]?.key;
    const a2 = history[len - 3]?.key;
    const b2 = history[len - 4]?.key;
    if (a1 === a2 && b1 === b2 && a1 !== b1) {
      return {
        isThrashing: true,
        reason: 'oscillating_loop',
        repeatCount: 4,
        critique: `[JEV CYCLE VETO]: 2-step oscillating loop detected (${b1} <-> ${a1}). You are reverting changes between two states. Re-assess the overall system architecture.`
      };
    }
  }

  // 4. Triangular circular loop (A -> B -> C -> A -> B -> C)
  if (len >= 6) {
    const slice1 = `${history[len - 1]?.key}|${history[len - 2]?.key}|${history[len - 3]?.key}`;
    const slice2 = `${history[len - 4]?.key}|${history[len - 5]?.key}|${history[len - 6]?.key}`;
    if (slice1 === slice2) {
      return {
        isThrashing: true,
        reason: 'triangular_oscillation',
        repeatCount: 6,
        critique: `[JEV CYCLE VETO]: 3-step triangular loop detected. You are cycling through a 3-point loop without making forward progress. Halt and inspect errors.`
      };
    }
  }

  return {
    isThrashing: false,
    repeatCount,
    variance: editClassification.variance,
    allowedRepeats: allowed
  };
}

export function clearHistory(sessionId = 'default') {
  const { stateFile, shadowDir } = getSessionPaths(sessionId);
  if (fs.existsSync(stateFile)) {
    try { fs.unlinkSync(stateFile); } catch {}
  }
  if (fs.existsSync(shadowDir)) {
    try { fs.rmSync(shadowDir, { recursive: true, force: true }); } catch {}
  }
}
