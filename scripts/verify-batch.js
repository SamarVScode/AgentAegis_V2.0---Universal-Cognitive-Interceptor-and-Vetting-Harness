#!/usr/bin/env node

/**
 * Jev Batch Verifier (scripts/verify-batch.js)
 * Adjudicates completed batch implementations using TypeSafe AI Jev System One (jev-1.13.0).
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

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
    gitDiff = execSync('git diff -U3 -- harness/', { encoding: 'utf8' }).slice(0, 25000);
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
  const stateContext = {
    batch: batchName,
    itemsDescription,
    testPassed,
    testSummary: testOutput.slice(-1000).trim(),
    gitDiff: gitDiff.slice(0, 20000),
    extraFiles
  };

  try {
    const res = await callJevSystemOne({
      state: JSON.stringify(stateContext, null, 2),
      questions: {
        batch_adjudication: {
          type: 'choice',
          instructions: `Adjudicate the implementation of ${batchName} (${itemsDescription}). Decide if the code changes meet specifications and pass verification.`,
          choices: ['approved', 'rejected'],
          criteria: {
            approved: `The code cleanly and correctly implements the targeted items (${itemsDescription}), all 11 automated test suites pass, syntax is valid, and functionality is preserved without regressions.`,
            rejected: `The code contains unhandled exceptions, regressions, broken syntax, failed tests, or does not implement the targeted items.`
          }
        }
      }
    });

    const ans = res.answers?.batch_adjudication;
    const choice = ans?.choice || 'rejected';
    const approvedProb = ans?.probabilities?.approved ?? (choice === 'approved' ? 1.0 : 0.0);
    const confidence = ans?.confidence ?? 1.0;
    const isApproved = choice === 'approved' && approvedProb >= 0.50 && testPassed;

    console.log(`\n------------------------------------------------------`);
    console.log(`Jev Decision: ${isApproved ? 'APPROVED' : 'VETOED'}`);
    console.log(`Choice: ${choice}`);
    console.log(`Probability (approved): ${approvedProb}`);
    console.log(`Confidence: ${confidence}`);
    console.log(`Tokens: input=${res.usage?.input_tokens || 0}, output=${res.usage?.output_tokens || 0}`);
    console.log(`------------------------------------------------------\n`);

    if (isApproved) {
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
