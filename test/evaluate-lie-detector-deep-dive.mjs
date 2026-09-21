import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('================================================================================');
console.log('TYPESAFE AI JEV ARCHITECTURAL DEEP-DIVE: ACCEPTANCE GATE RECONCILIATION');
console.log('Model: jev-1.13.0 | Target: https://api.typesafe.ai/v1/systemone');
console.log('================================================================================\n');

const deepDiveState = {
  initial_verdict_summary: {
    standalone_layer_verdict: 'Rejected as standalone layer (P=0.49, Rubric=1.41)',
    preferred_architecture: 'integrate_into_acceptance_gate (P=0.66) using two_tier_telemetry_linter (P=0.95, hybrid approval P=0.82)',
    policy: 'calibrated_advisory_bipartite (P=0.59) + deterministic_telemetry_veto (P=0.39)'
  },
  proposed_integrated_implementation: {
    location: 'Layer 4 Acceptance Gate (harness/acceptance-gate.js) preExit hook',
    stage_1_zero_token: 'Deterministic Regex & State Linter: Diff agent handoff claims against actual process telemetry: 1) Did agent claim tests pass when exitCode != 0 or 0 tests executed? 2) Did agent claim files were created/modified that do not exist in git diff or working directory? 3) Did agent claim command succeeded when unhandled stderr was logged?',
    stage_2_calibrated_jev: 'If deterministic checks pass, invoke Jev System One with state envelope (handoff text, exit code, test summary, git status) to score consistency. If consistency < 0.30 on core facts, issue hard veto. If 0.30 to 0.75, issue advisory warning to agent context.'
  }
};

const questions = {
  integrated_acceptance_utility: {
    type: 'score',
    instructions: 'Score the architectural utility of embedding claim-to-telemetry reconciliation directly into Layer 4 Acceptance Gate as Stage 1.5 (between deterministic regex parser and Jev completion gate).',
    criteria: [
      'Level 0: Superfluous or redundant with existing test runner checks.',
      'Level 1: Minor improvement; catches occasional blatant lies about test runs.',
      'Level 2: Substantial architectural improvement; bridges physical telemetry with cognitive handoff integrity, eliminating deceptive exits with zero extra token cost for compliant runs.',
      'Level 3: Essential production requirement; indispensable for hardened autonomous operation.'
    ]
  },
  veto_trigger_boundary: {
    type: 'choice',
    instructions: 'What specific condition should trigger an immediate hard termination veto (exit code 2) during preExit reconciliation?',
    criteria: {
      blatant_test_or_artifact_fabrication: 'Hard veto when agent explicitly claims test success or file creation that directly contradicts deterministic telemetry (e.g. claimed 0 failures when exitCode != 0, or claimed created file that is absent from git/disk).',
      semantic_underdelivery_score: 'Hard veto whenever semantic task fulfillment score from Jev is below 0.50, even if tests passed.',
      never_veto_on_text: 'Never veto based on textual claims; rely solely on whether the test command itself passed with exitCode 0.',
      all_discrepancies_vetoed: 'Hard veto on any discrepancy between agent text and telemetry regardless of severity.'
    }
  },
  advisory_feedback_mechanism: {
    type: 'choice',
    instructions: 'When a non-critical inconsistency is detected (e.g., overstated completion, unverified partial progress, or minor hallucinated details), what is the optimal system response?',
    criteria: {
      inject_corrective_critique: 'Inject an objective reconciliation critique into the conversation context specifying the exact disparity between claimed actions and telemetry, allowing the agent to self-correct.',
      silent_user_annotation: 'Allow completion to proceed but annotate the handoff message with a disclaimer for the human user highlighting unverified claims.',
      silent_ignore: 'Ignore non-critical inconsistencies completely; only enforce deterministic invariants.',
      force_retry_loop: 'Force the agent into an autonomous retry loop until claims and state align 100%.'
    }
  },
  token_overhead_minimization: {
    type: 'noul',
    instructions: 'Can this reconciliation layer operate with zero extra token overhead during typical, truthful agent runs by triggering Jev System One evaluation only when a deterministic discrepancy is detected by the local linter?',
    criteria: {
      true: 'Yes, running local deterministic telemetry diffing as Tier 1 ensures 0 tokens and 0ms latency for honest agents, calling Jev System One only when suspicious discrepancies or high-stakes semantic claims occur.',
      false: 'No, every completion statement requires full semantic evaluation by Jev System One to detect subtle deceptions.'
    }
  }
};

async function runDeepDive() {
  console.log('Dispatching deep-dive architectural inquiry to Jev System One...\n');
  const startTime = Date.now();

  const response = await callJevSystemOne({
    state: deepDiveState,
    questions,
    timeoutMs: 25000
  });
  const elapsed = Date.now() - startTime;

  console.log(`Received deep-dive response in ${elapsed}ms\n`);
  console.log('Model:', response.model);
  console.log('Usage:', response.usage);
  console.log('\n================================================================================');
  console.log('JEV DEEP-DIVE RESULTS');
  console.log('================================================================================\n');

  const answers = response.answers || {};
  console.log('1. Integrated Acceptance Gate Utility Rubric:', answers.integrated_acceptance_utility?.score, '/ 3.00');
  console.log('   Description:', answers.integrated_acceptance_utility?.legend?.[Math.round(answers.integrated_acceptance_utility?.score)]);
  console.log('2. Veto Trigger Boundary Choice:', answers.veto_trigger_boundary?.choice);
  console.log('   Probabilities:', JSON.stringify(answers.veto_trigger_boundary?.probabilities, null, 2));
  console.log('3. Advisory Feedback Mechanism Choice:', answers.advisory_feedback_mechanism?.choice);
  console.log('   Probabilities:', JSON.stringify(answers.advisory_feedback_mechanism?.probabilities, null, 2));
  console.log('4. Zero Token Overhead Feasibility (noul):', answers.token_overhead_minimization?.noul);

  const outPayload = {
    timestamp: new Date().toISOString(),
    model: response.model,
    elapsed_ms: elapsed,
    usage: response.usage,
    deep_dive_state: deepDiveState,
    answers
  };

  const outPath = path.join(rootDir, 'test', 'lie-detector-deep-dive.json');
  fs.writeFileSync(outPath, JSON.stringify(outPayload, null, 2), 'utf8');
  console.log(`\nDeep-dive adjudication saved to: ${outPath}`);
}

runDeepDive().catch(err => {
  console.error('Deep dive error:', err);
  process.exit(1);
});
