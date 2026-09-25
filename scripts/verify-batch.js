#!/usr/bin/env node

/**
 * Jev Batch Verifier (scripts/verify-batch.js)
 * Adjudicates completed batch implementations using TypeSafe AI Jev System One (jev-1.13.0).
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { jevBooleanCheck } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const batchNum = process.argv[2] || '1';
  const batchName = process.argv[3] || `Batch ${batchNum}`;
  const itemsDescription = process.argv[4] || 'Batch implementation items';

  console.log(`\n======================================================`);
  console.log(`[JEV BATCH ADJUDICATION]: Evaluating ${batchName}`);
  console.log(`Model: jev-1.13.0 | Target: TypeSafe AI System One`);
  console.log(`======================================================\n`);

  // 1. Gather git diff
  let gitDiff = '';
  try {
    gitDiff = execSync('git diff -U3 -- harness/', { encoding: 'utf8' }).slice(0, 4000);
  } catch (err) {
    gitDiff = `Error capturing git diff: ${err.message}`;
  }

  // Also include relevant config files if present (e.g. .agents/hooks.json)
  let extraFiles = {};
  const hooksJsonPath = path.join(process.cwd(), '.agents', 'hooks.json');
  if (fs.existsSync(hooksJsonPath)) {
    try {
      extraFiles['.agents/hooks.json'] = fs.readFileSync(hooksJsonPath, 'utf8').trim();
    } catch {}
  }

  // 2. Run automated test suite
  let testOutput = '';
  let testPassed = false;
  try {
    testOutput = execSync('npm test', { encoding: 'utf8' });
    testPassed = testOutput.includes('DYNAMIC HARNESS TEST RESULTS: 11 PASSED, 0 FAILED');
  } catch (err) {
    testOutput = (err.stdout || '') + '\n' + (err.stderr || '');
    testPassed = false;
  }

  console.log(`Automated Tests Status: ${testPassed ? '11/11 PASSED' : 'FAILED'}`);

  // 3. Formulate Jev Bayesian Evaluation
  const assertion = `The proposed fixes for ${batchName} (${itemsDescription}) are correctly implemented, syntactically and logically sound, and preserve full test suite integrity without regressions.`;
  const criteriaTrue = `All targeted issues in ${batchName} are cleanly resolved, edge cases are addressed, and all automated test suites pass with 100% success.`;
  const criteriaFalse = `The code contains unhandled exceptions, regressions, broken syntax, failed tests, or incomplete implementations of the targeted items.`;

  const stateContext = {
    batch: batchName,
    itemsDescription,
    testPassed,
    testSummary: testOutput.slice(-1000).trim(),
    gitDiff: gitDiff.slice(0, 15000),
    extraFiles
  };

  try {
    const verdict = await jevBooleanCheck({
      state: JSON.stringify(stateContext, null, 2),
      assertion,
      criteriaTrue,
      criteriaFalse,
      isDestructive: false
    });

    console.log(`\n------------------------------------------------------`);
    console.log(`Jev Decision: ${verdict.approved ? 'APPROVED' : 'VETOED'}`);
    console.log(`Bayesian Probability: ${verdict.probability}`);
    console.log(`Reason: ${verdict.reason}`);
    console.log(`------------------------------------------------------\n`);

    if (verdict.approved) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error(`Jev verification call failed: ${err.message}`);
    process.exit(2);
  }
}

main();
