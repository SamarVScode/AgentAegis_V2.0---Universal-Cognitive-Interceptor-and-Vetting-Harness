#!/usr/bin/env node

/**
 * Universal Drop-In Installer (harness/install.js)
 * Automatically configures and merges lifecycle interceptor hooks for:
 *   - Claude Code (.claude/settings.json)
 *   - Cursor (.cursor/rules/jev-harness.mdc)
 *   - Antigravity / Agent CLI (.agents/hooks.json)
 * 
 * Features:
 *   - Non-destructive safe merge with backup
 *   - Explicit target flags & dry-run support
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates a timestamped backup of a file before modifying it.
 */
export function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const timestamp = Date.now();
    const backupPath = `${filePath}.bak.${timestamp}`;
    try {
      fs.copyFileSync(filePath, backupPath);
      return backupPath;
    } catch {}
  }
  return null;
}

/**
 * Ensures target workspace has a .env template for TYPESAFE_API_KEY.
 */
export function ensureEnvFile(targetDir, dryRun = false) {
  const envPath = path.join(targetDir, '.env');
  const template = '# TypeSafe Aegis - Jev Cognitive Interceptor\n# Add your TypeSafe API Key below.\nTYPESAFE_API_KEY=your_typesafe_api_key_here\n';

  if (!fs.existsSync(envPath)) {
    if (!dryRun) {
      fs.writeFileSync(envPath, template, 'utf8');
    }
    return { created: true, path: envPath };
  }

  const existing = fs.readFileSync(envPath, 'utf8');
  if (!existing.includes('TYPESAFE_API_KEY')) {
    if (!dryRun) {
      fs.appendFileSync(envPath, '\n# TypeSafe Aegis Configuration\nTYPESAFE_API_KEY=your_typesafe_api_key_here\n', 'utf8');
    }
    return { updated: true, path: envPath };
  }

  return { exists: true, path: envPath };
}

/**
 * Ensures target workspace has a CLAUDE.md with Universal Guidelines.
 */
export function ensureClaudeMarkdown(targetDir, dryRun = false) {
  const claudeFile = path.join(targetDir, 'CLAUDE.md');
  if (fs.existsSync(claudeFile)) {
    return { exists: true, file: claudeFile };
  }

  const content = `# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
- When your changes create orphans: Remove imports/variables/functions that your changes made unused.
- The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
- Transform tasks into verifiable goals:
  - "Add validation" -> "Write tests for invalid inputs, then make them pass"
  - "Fix the bug" -> "Write a test that reproduces it, then make them pass"
  - "Refactor X" -> "Ensure tests pass before and after"
- For multi-step tasks, state a brief plan:
\`\`\`
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
\`\`\`
- Deterministic Verification: Run the automated test suite (\`npm test\`) before declaring any task complete.

## 5. Token Efficiency & Context Protection
- Universal Research Sandboxing: When reading multi-file documentation (Obsidian vaults, markdown notes, PDF specs, Excel/CSV datasets, or multi-query web searches), never dump raw files or scraped search outputs directly into coordinator context. Delegate bulk research to an ephemeral subagent that distills findings into a compact <1,500 token summary artifact (RESEARCH.md) and terminates. The coordinator only reads the summary artifact once.
- Focal Chunking: When inspecting code files, use targeted line slices (StartLine/EndLine) or symbol grep rather than loading entire multi-thousand-line files.
- Supervisor Coordination: Do not poll subagent or task status in an active loop. Stop calling tools and rely on reactive wakeups.
`;

  if (!dryRun) {
    fs.writeFileSync(claudeFile, content, 'utf8');
  }

  return { created: true, file: claudeFile };
}

/**
 * Ensures target workspace has a GEMINI.md with Universal Guidelines for Antigravity.
 */
export function ensureAntigravityMarkdown(targetDir, dryRun = false) {
  const geminiFile = path.join(targetDir, 'GEMINI.md');
  if (fs.existsSync(geminiFile)) {
    return { exists: true, file: geminiFile };
  }

  const content = `# TypeSafe AI Jev Guardrails Active

> [!NOTE]
> This workspace is actively monitored by the **TypeSafe AI Jev Interceptor Harness**.

## Operational Guidelines

### 1. Think Before Coding
- Don't assume. Don't hide confusion. Surface tradeoffs explicitly.
- State your assumptions before implementing. If uncertain, ask.
- If multiple interpretations exist, present them rather than picking silently.

### 2. Simplicity First
- Minimum code that solves the problem. Nothing speculative.
- No unrequested abstractions, extra configurability, or future-proofing.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes (Zero Thrashing)
- Touch only what you must. Clean up only your own changes.
- Do not modify or reformat adjacent working code.
- If Jev or the cycle detector issues a warning or veto regarding repetitive edits, immediately halt and pivot your implementation strategy. Do not retry identical modifications.

### 4. Goal-Driven Execution (Deterministic Verification)
- Prior to declaring any task complete, run the project's automated test suite (\`npm test\`) to satisfy the Jev Acceptance Gate.
- The Lie Detector audits agent claims against disk and test truth before completion is approved.
- Keep diffs and outputs concise. Bounded context enforced.

### 5. Token Efficiency & Context Protection
- Universal Research Sandboxing: For multi-file documentation (Obsidian vaults, markdown directories, PDF specs, Excel/CSV datasets, or multi-query web searches), do not dump raw files or scraped HTML into coordinator context. Delegate bulk research to an ephemeral subagent that produces a compact <1,500 token summary artifact (RESEARCH.md).
- Focal Chunking: Read only necessary line slices (StartLine/EndLine) or symbol search rather than loading whole multi-thousand-line files.
- Supervisor Coordination: Never poll subagents or tasks in an active loop. Rely on reactive wakeups or schedule timers.
`;

  if (!dryRun) {
    fs.writeFileSync(geminiFile, content, 'utf8');
  }

  return { created: true, file: geminiFile };
}

/**
 * Detects installed agent environments in the target directory or user profile.
 */
export function detectInstalledEngines(targetDir = process.cwd()) {
  const engines = [];

  // Antigravity check
  if (fs.existsSync(path.join(targetDir, '.agents')) || fs.existsSync(path.join(os.homedir(), '.agents')) || fs.existsSync(path.join(targetDir, 'GEMINI.md'))) {
    engines.push('antigravity');
  }

  // Claude Code check
  if (fs.existsSync(path.join(targetDir, '.claude')) || fs.existsSync(path.join(targetDir, '.claude.json')) || fs.existsSync(path.join(os.homedir(), '.claude'))) {
    engines.push('claude');
  }

  // Cursor check
  if (fs.existsSync(path.join(targetDir, '.cursor')) || fs.existsSync(path.join(targetDir, '.cursorrules'))) {
    engines.push('cursor');
  }

  // If none explicitly detected, default to antigravity & claude
  if (engines.length === 0) {
    engines.push('antigravity', 'claude');
  }

  return engines;
}

/**
 * Installs Claude Code hooks into .claude/settings.json
 */
export function installClaudeHooks(targetDir, interceptorPath, dryRun = false) {
  const claudeDir = path.join(targetDir, '.claude');
  const settingsFile = path.join(claudeDir, 'settings.json');

  let existing = {};
  if (fs.existsSync(settingsFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    } catch {
      existing = {};
    }
  }

  const relPath = path.relative(targetDir, interceptorPath).replace(/\\/g, '/');
  const execPath = (relPath && !relPath.startsWith('..') && !path.isAbsolute(relPath))
    ? (relPath.startsWith('.') ? relPath : `./${relPath}`)
    : interceptorPath;

  const preToolCmd = `node "${execPath}" --engine claude pre-tool`;
  const stopCmd = `node "${execPath}" --engine claude verify-gate`;

  const updated = { ...existing };
  if (!updated.hooks || typeof updated.hooks !== 'object') {
    updated.hooks = {};
  }

  // Merge PreToolUse
  if (!Array.isArray(updated.hooks.PreToolUse)) updated.hooks.PreToolUse = [];
  const preHook = { matcher: '.*', hooks: [{ type: 'command', command: preToolCmd }] };
  const preIdx = updated.hooks.PreToolUse.findIndex(h => typeof h === 'object' && h.hooks?.[0]?.command?.includes('interceptor.js'));
  if (preIdx !== -1) updated.hooks.PreToolUse[preIdx] = preHook;
  else updated.hooks.PreToolUse.push(preHook);

  // Merge Stop
  if (!Array.isArray(updated.hooks.Stop)) updated.hooks.Stop = [];
  const stopHook = { matcher: '.*', hooks: [{ type: 'command', command: stopCmd }] };
  const stopIdx = updated.hooks.Stop.findIndex(h => typeof h === 'object' && h.hooks?.[0]?.command?.includes('interceptor.js'));
  if (stopIdx !== -1) updated.hooks.Stop[stopIdx] = stopHook;
  else updated.hooks.Stop.push(stopHook);


  const content = JSON.stringify(updated, null, 2) + '\n';

  if (!dryRun) {
    if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });
    backupFile(settingsFile);
    fs.writeFileSync(settingsFile, content, 'utf8');
  }

  return { target: 'claude', file: settingsFile, content };
}

/**
 * Installs Antigravity hooks into .agents/hooks.json
 */
export function installAntigravityHooks(targetDir, interceptorPath, dryRun = false) {
  const agentsDir = path.join(targetDir, '.agents');
  const hooksFile = path.join(agentsDir, 'hooks.json');

  let existing = {};
  if (fs.existsSync(hooksFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
    } catch {
      existing = {};
    }
  }

  const relPath = path.relative(targetDir, interceptorPath).replace(/\\/g, '/');
  const execPath = (relPath && !relPath.startsWith('..') && !path.isAbsolute(relPath))
    ? (relPath.startsWith('.') ? relPath : `./${relPath}`)
    : interceptorPath;

  const preToolCmd = `node "${execPath}" --engine antigravity pre-tool`;
  const stopCmd = `node "${execPath}" --engine antigravity verify-gate`;

  const updated = { ...existing };
  if (!updated.hooks || typeof updated.hooks !== 'object') {
    updated.hooks = {};
  }

  // Merge PreToolUse
  if (!Array.isArray(updated.hooks.PreToolUse)) updated.hooks.PreToolUse = [];
  const preIdx = updated.hooks.PreToolUse.findIndex(h => typeof h === 'object' && h.command && h.command.includes('interceptor.js'));
  if (preIdx !== -1) updated.hooks.PreToolUse[preIdx] = { command: preToolCmd };
  else updated.hooks.PreToolUse.push({ command: preToolCmd });

  // Merge Stop
  if (!Array.isArray(updated.hooks.Stop)) updated.hooks.Stop = [];
  const stopIdx = updated.hooks.Stop.findIndex(h => typeof h === 'object' && h.command && h.command.includes('interceptor.js'));
  if (stopIdx !== -1) updated.hooks.Stop[stopIdx] = { command: stopCmd };
  else updated.hooks.Stop.push({ command: stopCmd });

  const content = JSON.stringify(updated, null, 2) + '\n';

  if (!dryRun) {
    if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir, { recursive: true });
    backupFile(hooksFile);
    fs.writeFileSync(hooksFile, content, 'utf8');
  }

  return { target: 'antigravity', file: hooksFile, content };
}

/**
 * Installs Cursor rule into .cursor/rules/jev-harness.mdc
 */
export function installCursorRule(targetDir, interceptorPath, dryRun = false) {
  const cursorRulesDir = path.join(targetDir, '.cursor', 'rules');
  const ruleFile = path.join(cursorRulesDir, 'jev-harness.mdc');

  const ruleContent = `---
description: TypeSafe AI Jev Cognitive Interceptor & Acceptance Gate Enforcement
globs: *
alwaysApply: true
---

# Universal Aegis Guidelines
1. Think Before Coding: State assumptions explicitly and surface tradeoffs before implementing.
2. Simplicity First: Write minimum code that solves the problem; zero speculative abstractions.
3. Surgical Changes: Touch only what you must; avoid repetitive edits to prevent thrashing circuit breakers.
4. Goal-Driven Execution: Run the automated test suite ('npm test' / verify-gate) before declaring completion.
`;

  if (!dryRun) {
    if (!fs.existsSync(cursorRulesDir)) fs.mkdirSync(cursorRulesDir, { recursive: true });
    backupFile(ruleFile);
    fs.writeFileSync(ruleFile, ruleContent, 'utf8');
  }

  return { target: 'cursor', file: ruleFile, content: ruleContent };
}

/**
 * Main install entrypoint
 */
export function runInstall(options = {}) {
  const targetDir = options.targetDir ? path.resolve(options.targetDir) : process.cwd();
  const dryRun = Boolean(options.dryRun);
  const requestedTargets = options.targets || [];
  const interceptorPath = options.interceptorPath || path.resolve(targetDir, 'harness', 'interceptor.js');

  console.log('================================================================================');
  console.log('JEV COGNITIVE HARNESS - UNIVERSAL DROP-IN INSTALLER');
  console.log(`Target Workspace : ${targetDir}`);
  console.log(`Dry Run Mode     : ${dryRun}`);
  console.log('================================================================================\n');

  // Copy harness folder if installing into an external target
  const sourceHarnessDir = path.resolve(__dirname);
  const targetHarnessDir = path.resolve(targetDir, 'harness');
  if (sourceHarnessDir !== targetHarnessDir && !dryRun) {
    if (!fs.existsSync(targetHarnessDir)) fs.mkdirSync(targetHarnessDir, { recursive: true });
    const filesToCopy = fs.readdirSync(sourceHarnessDir);
    for (const f of filesToCopy) {
      const srcFile = path.join(sourceHarnessDir, f);
      const destFile = path.join(targetHarnessDir, f);
      if (fs.statSync(srcFile).isFile()) {
        fs.copyFileSync(srcFile, destFile);
      }
    }
    console.log(` Copied 11 harness modules into: ${targetHarnessDir}`);
  }

  // Determine active targets
  let targets = requestedTargets.length > 0 ? requestedTargets : detectInstalledEngines(targetDir);
  if (requestedTargets.includes('all')) {
    targets = ['claude', 'antigravity', 'cursor'];
  }

  const results = [];

  for (const t of targets) {
    if (t === 'claude') {
      const res = installClaudeHooks(targetDir, interceptorPath, dryRun);
      results.push(res);
      console.log(` [Claude Code] Hook configured: ${res.file}`);
      const mdRes = ensureClaudeMarkdown(targetDir, dryRun);
      if (mdRes.created) {
        console.log(` [Claude Code] Generated CLAUDE.md: ${mdRes.file}`);
      } else {
        console.log(` [Claude Code] Existing CLAUDE.md preserved: ${mdRes.file}`);
      }
    } else if (t === 'antigravity') {
      const res = installAntigravityHooks(targetDir, interceptorPath, dryRun);
      results.push(res);
      console.log(` [Antigravity] Hook configured: ${res.file}`);
      const mdRes = ensureAntigravityMarkdown(targetDir, dryRun);
      if (mdRes.created) {
        console.log(` [Antigravity] Generated GEMINI.md: ${mdRes.file}`);
      } else {
        console.log(` [Antigravity] Existing GEMINI.md preserved: ${mdRes.file}`);
      }
    } else if (t === 'cursor') {
      const res = installCursorRule(targetDir, interceptorPath, dryRun);
      results.push(res);
      console.log(` [Cursor] Rule injected: ${res.file}`);
    }
  }
  // Ensure .env configuration file exists
  const envResult = ensureEnvFile(targetDir, dryRun);
  if (envResult.created) {
    console.log(` [Config] Created template .env at: ${envResult.path}`);
  } else if (envResult.updated) {
    console.log(` [Config] Appended TYPESAFE_API_KEY placeholder to: ${envResult.path}`);
  } else {
    console.log(` [Config] Existing .env file verified: ${envResult.path}`);
  }

  console.log('\n================================================================================');
  console.log(`Installation complete for ${results.length} environment(s). Zero-config active!`);
  console.log('Next Steps:');
  console.log('  1. Open .env and set your TYPESAFE_API_KEY');
  console.log('  2. Run your coding agent normally (Claude Code, Cursor, or Antigravity)');
  console.log('================================================================================\n');

  const mainConfig = results[0] ? JSON.parse(results[0].content) : buildMergedHooksConfig({}, 'antigravity', interceptorPath);
  return {
    success: true,
    dryRun,
    targetDir,
    results,
    config: mainConfig,
    hooksFile: results[0]?.file
  };
}

// CLI handler
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  let dryRun = false;
  let targetDir = process.cwd();
  const targets = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--all') targets.push('all');
    else if (arg === '--claude') targets.push('claude');
    else if (arg === '--cursor') targets.push('cursor');
    else if (arg === '--antigravity') targets.push('antigravity');
    else if (arg === '--target-dir' && args[i + 1]) {
      targetDir = args[i + 1];
      i++;
    }
  }

  try {
    runInstall({ dryRun, targetDir, targets });
  } catch (err) {
    console.error('Installer failed:', err.message);
    process.exit(1);
  }
}

export const installHooks = (options = {}) => {
  const opts = typeof options === 'object' ? { ...options } : {};
  if (opts.engine && !opts.targets) {
    opts.targets = [opts.engine];
  }
  return runInstall(opts);
};

export const detectEngine = (targetDir) => detectInstalledEngines(targetDir)[0] || 'antigravity';

export function buildMergedHooksConfig(existingConfig = {}, engine = 'antigravity', interceptorPath = null) {
  const resolvedInterceptor = interceptorPath || path.resolve(__dirname, 'interceptor.js');
  const preToolCmd = `node "${resolvedInterceptor}" --engine ${engine} pre-tool`;
  const stopCmd = `node "${resolvedInterceptor}" --engine ${engine} verify-gate`;

  const config = JSON.parse(JSON.stringify(existingConfig || {}));
  const usesNestedHooks = config.hooks && typeof config.hooks === 'object';
  const target = usesNestedHooks ? config.hooks : (config.PreToolUse || config.Stop ? config : (config.hooks = {}));

  if (!Array.isArray(target.PreToolUse)) target.PreToolUse = [];
  const preEntry = { command: preToolCmd };
  const preIdx = target.PreToolUse.findIndex(entry => {
    const cmd = typeof entry === 'string' ? entry : (entry?.command || '');
    return cmd.includes('interceptor.js');
  });
  if (preIdx !== -1) target.PreToolUse[preIdx] = preEntry;
  else target.PreToolUse.push(preEntry);

  if (!Array.isArray(target.Stop)) target.Stop = [];
  const stopEntry = { command: stopCmd };
  const stopIdx = target.Stop.findIndex(entry => {
    const cmd = typeof entry === 'string' ? entry : (entry?.command || '');
    return cmd.includes('interceptor.js');
  });
  if (stopIdx !== -1) target.Stop[stopIdx] = stopEntry;
  else target.Stop.push(stopEntry);

  return config;
}
