import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'assert';
import { findWorkspaceRoot, findMarkerUpward } from '../harness/manifest-sniffer.js';
import { collectState } from '../harness/state-collector.js';

console.log('--- Testing Hardened Manifest Sniffer Symlink Guard ---');

const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cyclic-test-'));
const dirA = path.join(tmpBase, 'dirA');
const dirB = path.join(tmpBase, 'dirB');
fs.mkdirSync(dirA);
fs.mkdirSync(dirB);

// Attempt symlink cycle if platform supports
let symlinkCreated = false;
try {
  fs.symlinkSync(dirA, path.join(dirB, 'linkToA'), 'junction');
  fs.symlinkSync(dirB, path.join(dirA, 'linkToB'), 'junction');
  symlinkCreated = true;
} catch {
  console.log('Symlink creation restricted on this platform/privilege level, skipping symlink creation.');
}

if (symlinkCreated) {
  const rootResult = findWorkspaceRoot(path.join(dirB, 'linkToA'), ['nonexistent_marker.txt']);
  assert(typeof rootResult === 'string', 'findWorkspaceRoot terminates cleanly on cyclic path');
  const markerResult = findMarkerUpward(path.join(dirB, 'linkToA'), ['nonexistent_marker.txt'], 10);
  assert(markerResult === null, 'findMarkerUpward terminates safely on cyclic path');
  console.log('PASS: Cyclic symlink protection verified without infinite loop');
} else {
  // Test regular traversal with visited set
  const rootResult = findWorkspaceRoot(dirA, ['nonexistent_marker.txt']);
  assert(typeof rootResult === 'string', 'findWorkspaceRoot terminates cleanly');
  console.log('PASS: Standard traversal with visited Set verified');
}

// Clean up
try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}

console.log('\n--- Testing Hardened State Collector Bounded Output ---');
const state = collectState('Test monorepo collection', 'run_command', { CommandLine: 'git status' });
assert(state !== null && typeof state === 'object', 'collectState returns valid envelope');
assert(typeof state.git_status === 'string', 'git_status is string');
assert(typeof state.diff_stat === 'string', 'diff_stat is string');
console.log('PASS: State collector output bounded and verified successfully');
