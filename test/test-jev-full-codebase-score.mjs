import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const allFiles = [
  'harness/interceptor.js',
  'harness/acceptance-gate.js',
  'harness/cycle-detector.js',
  'harness/sensitive-guard.js',
  'harness/diff-variance.js',
  'harness/runner-parser.js',
  'harness/manifest-sniffer.js',
  'harness/jev-client.js',
  'harness/install.js',
  'harness/state-collector.js',
  'harness/core-laws-linter.js',
  'harness/jev-vetter.js',
  'bin/cli.js',
  'index.js'
];

const fullCodebase = {};
for (const f of allFiles) {
  const raw = fs.readFileSync(path.join(rootDir, f), 'utf8');
  // Strip block comments and full-line comments safely without mangling inline strings or regexes
  const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*\r?\n/gm, '').replace(/^\s*[\r\n]/gm, '');
  fullCodebase[f] = cleaned;
}

console.log('--- JEV SYSTEM ONE COMPREHENSIVE CODEBASE EVALUATION ---');
console.log('Sending full 14-file codebase context to Jev System One (jev-1.13.0)...');

const res = await callJevSystemOne({
  state: {
    codebase: fullCodebase,
    context: 'AgentAegis V2.0 Full Codebase Evaluation after Hardening and Security Fixes'
  },
  questions: {
    production_readiness_score: {
      type: 'score',
      instructions: 'Score the overall production readiness and architectural soundness of the AgentAegis V2.0 codebase on a 0.00 to 3.00 scale.',
      criteria: [
        '0: Incomplete or prototype with critical unhandled crashes',
        '1: Functional but fragile, inconsistent error handling, incomplete safeguards',
        '2: Robust, production-grade architecture with deterministic testing, fail-safes, and dual-layer defense',
        '3: Exceptional executive-grade engineering with comprehensive multi-engine verification'
      ]
    },
    security_integrity_score: {
      type: 'score',
      instructions: 'Score the security posture and lifecycle interception defense (fail-closed, shell injection prevention, credential screening) on a 0.00 to 3.00 scale.',
      criteria: [
        '0: Ineffective security, easy to bypass',
        '1: Basic filtering with notable bypass routes',
        '2: Hardened defense-in-depth with fail-closed gates and command argument inspection',
        '3: Elite defense with zero observable userspace bypass vectors'
      ]
    },
    interceptor_resilience_score: {
      type: 'score',
      instructions: 'Rate the resilience of the interceptor error handling, inactivity timer reset, and parent-PID session isolation on a 0.00 to 3.00 scale.',
      criteria: [
        '0: Crashes drop payloads or fail open',
        '1: Inconsistent session tracking or stream handling',
        '2: Robust streaming stdin handling, PPID session isolation, and fail-closed gates',
        '3: Bulletproof lifecycle interceptor'
      ]
    },
    is_harness_worth_using: {
      type: 'noul',
      instructions: 'Is AgentAegis worth deploying in autonomous coding agent workflows (Claude Code, Cursor, Antigravity) to bound tokens, halt thrashing, and gate builds?',
      criteria: {
        true: 'Yes, AgentAegis provides significant value by halting runaway loops, screening sensitive paths, and enforcing deterministic test gates.',
        false: 'No, the harness introduces more friction or overhead than value.'
      }
    },
    production_deployment_verdict: {
      type: 'choice',
      instructions: 'What is the final deployment verdict for the AgentAegis V2.0 harness?',
      criteria: {
        ready_for_production_deployment: 'Ready for Deployment: Codebase is robust, deterministic, all tests pass, and security boundaries are properly defined.',
        needs_further_remediation: 'Needs Further Work: Critical functional or architectural blockers remain.'
      }
    }
  },
  timeoutMs: 90000
});

console.log('\n--- JEV SYSTEM ONE FINAL EVALUATION RESULTS ---');
console.log(JSON.stringify(res.answers, null, 2));

const fullReport = {
  timestamp: new Date().toISOString(),
  adjudicator: 'jev-1.13.0',
  endpoint: 'https://api.typesafe.ai/v1/systemone',
  usage: res.usage,
  answers: res.answers
};

fs.writeFileSync(
  path.join(rootDir, 'test', 'jev-final-codebase-evaluation.json'),
  JSON.stringify(fullReport, null, 2),
  'utf8'
);
console.log('\nReport saved to test/jev-final-codebase-evaluation.json');
