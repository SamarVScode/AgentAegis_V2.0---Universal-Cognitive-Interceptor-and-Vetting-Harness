import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-hook-test-'));

console.log('1. Setting up fresh workspace:', tmpDir);

// Initialize with aegis CLI
const cliPath = path.join(rootDir, 'bin', 'cli.js');
execSync(`node "${cliPath}" --target-dir "${tmpDir}" --all`, { stdio: 'pipe' });

// Verify generated Claude Code hooks
const claudeSettings = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8'));
const claudePreCmd = claudeSettings.hooks.PreToolUse[0].hooks[0].command;
const claudeStopCmd = claudeSettings.hooks.Stop[0].hooks[0].command;
console.log('2. Claude Code PreTool command:', claudePreCmd);
console.log('   Claude Code Stop command:', claudeStopCmd);

// Verify generated Antigravity hooks
const agHooks = JSON.parse(fs.readFileSync(path.join(tmpDir, '.agents', 'hooks.json'), 'utf8'));
const agPreCmd = agHooks.hooks.PreToolUse[0].command;
const agStopCmd = agHooks.hooks.Stop[0].command;
console.log('3. Antigravity PreTool command:', agPreCmd);
console.log('   Antigravity Stop command:', agStopCmd);

// Verify generated markdown instruction files
const hasClaudeMd = fs.existsSync(path.join(tmpDir, 'CLAUDE.md'));
const hasGeminiMd = fs.existsSync(path.join(tmpDir, 'GEMINI.md'));
assert(hasClaudeMd, 'CLAUDE.md was generated');
assert(hasGeminiMd, 'GEMINI.md was generated');
const claudeMdContent = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
const geminiMdContent = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
assert(claudeMdContent.includes('Think Before Coding') && claudeMdContent.includes('Surgical Changes'), 'CLAUDE.md has guidelines');
assert(geminiMdContent.includes('TypeSafe AI Jev Guardrails Active') && geminiMdContent.includes('Think Before Coding'), 'GEMINI.md has guidelines');
console.log('3b. Markdown instruction files generated: CLAUDE.md and GEMINI.md verified.');

// 4. Test live execution of Claude pre-tool hook with benign input
execSync(claudePreCmd, {
  cwd: tmpDir,
  input: JSON.stringify({ tool_name: 'view_file', tool_input: { AbsolutePath: 'src/index.js' } }),
  stdio: 'pipe'
});
console.log('4. Claude benign pre-tool execution: SUCCESS (exit 0)');

// 5. Test live execution of Claude pre-tool hook with destructive input (must veto with exit code 2)
let claudeVetoCaught = false;
try {
  execSync(claudePreCmd, {
    cwd: tmpDir,
    input: JSON.stringify({ tool_name: 'run_command', tool_input: { CommandLine: 'rm -rf /' } }),
    stdio: 'pipe'
  });
} catch (err) {
  if (err.status === 2) {
    claudeVetoCaught = true;
    console.log('5. Claude destructive veto: CAUGHT WITH EXIT CODE 2');
  }
}
assert(claudeVetoCaught, 'Claude hook must block rm -rf with exit code 2');

// 6. Test live execution of Antigravity pre-tool hook with benign input
const agWorkingDir = path.join(tmpDir, '.agents');
execSync(agPreCmd, {
  cwd: agWorkingDir,
  input: JSON.stringify({ toolCall: { name: 'view_file', args: { AbsolutePath: 'src/index.js' } } }),
  stdio: 'pipe'
});
console.log('6. Antigravity benign pre-tool execution: SUCCESS (exit 0)');

// 7. Test live execution of Antigravity pre-tool hook with destructive input
let agVetoCaught = false;
try {
  execSync(agPreCmd, {
    cwd: agWorkingDir,
    input: JSON.stringify({ toolCall: { name: 'run_command', args: { CommandLine: 'rm -rf /' } } }),
    stdio: 'pipe'
  });
} catch (err) {
  if (err.status === 2) {
    agVetoCaught = true;
    console.log('7. Antigravity destructive veto: CAUGHT WITH EXIT CODE 2');
  }
}
assert(agVetoCaught, 'Antigravity hook must block rm -rf with exit code 2');

// Cleanup
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

console.log('\n================================================================================');
console.log('LIVE HOOK EXECUTION VERIFIED FOR BOTH CLAUDE CODE AND ANTIGRAVITY (100% PASS)');
console.log('================================================================================');
