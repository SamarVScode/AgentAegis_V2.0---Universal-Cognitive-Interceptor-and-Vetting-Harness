/**
 * Child process worker for Concurrent Session Contention testing
 * Invoked by test/run-concurrency-stress.mjs
 */

import { checkCycle, getSessionPaths } from '../../harness/cycle-detector.js';
import fs from 'fs';

const args = process.argv.slice(2);
const workerId = parseInt(args[0] || '1', 10);
const sessionId = args[1] || 'concurrent-stress-session';
const iterations = parseInt(args[2] || '5', 10);
const mode = args[3] || 'standard'; // 'standard' or 'unwrapped_rename'

const results = {
  workerId,
  pid: process.pid,
  attempted: iterations,
  successful: 0,
  errors: [],
  renameErrors: [],
  timestamps: []
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  for (let i = 0; i < iterations; i++) {
    const targetFile = `worker_${workerId}_test_${i}.js`;
    const toolName = 'write_to_file';
    const content = `// worker ${workerId} iter ${i} timestamp ${Date.now()}`;
    const t0 = Date.now();

    if (mode === 'unwrapped_rename') {
      // Test unwrapped fs.renameSync to empirically detect Windows EPERM / EBUSY
      const { dir, stateFile } = getSessionPaths(sessionId);
      const tmpFile = `${stateFile}.stress_unwrapped.${process.pid}.${i}`;
      try {
        fs.writeFileSync(tmpFile, JSON.stringify({ workerId, i, pid: process.pid, time: Date.now() }), 'utf8');
        fs.renameSync(tmpFile, stateFile);
        results.successful++;
      } catch (err) {
        results.renameErrors.push({
          iteration: i,
          code: err.code,
          message: err.message
        });
        // clean up tmp if left
        try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch {}
      }
    } else {
      // Standard checkCycle execution
      try {
        const cycle = checkCycle(toolName, targetFile, content, sessionId);
        results.successful++;
      } catch (err) {
        results.errors.push({
          iteration: i,
          code: err.code,
          message: err.message
        });
      }
    }
    results.timestamps.push(Date.now() - t0);
    // Micro jitter (0-2ms) to interleave operations
    if (iterations > 1) {
      await sleep(Math.floor(Math.random() * 3));
    }
  }

  // Print single line JSON result for parent process parser
  console.log(`WORKER_RESULT:${JSON.stringify(results)}`);
}

run().catch(err => {
  console.error(`WORKER_FATAL:${err.message}`);
  process.exit(1);
});
