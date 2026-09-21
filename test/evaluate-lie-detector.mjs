import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('================================================================================');
console.log('TYPESAFE AI JEV ARCHITECTURAL EVALUATION: LIE DETECTOR LAYER');
console.log('Model: jev-1.13.0 | Target: https://api.typesafe.ai/v1/systemone');
console.log('================================================================================\n');

// Prepare deep architectural state and context for Jev System One
const architecturalState = {
  harness: 'TypeSafe Aegis Interceptor Harness v2.1',
  existing_pipeline: {
    layer_1_fastpath: 'Zero-token heuristic checks, safe command allowlists, read inspection guards, and 4 Core Laws linter.',
    layer_2_security: 'Bipartite fail-safe security guard (fail-closed on destructive tools/patterns, fail-open with warnings on benign reads).',
    layer_3_thrashing_circuit_breaker: 'Cycle detector & diff variance breaker (3 repeats for <15% variance, 5 repeats for substantive edits) with shadow buffer virtual file reconstruction.',
    layer_4_acceptance_gate: 'Dual-stage pre-exit verification: Stage 1 deterministic multi-framework runner parser (Jest/Vitest/Mocha/TAP/Pytest/Cargo/Go) with benign stderr triage, Stage 2 Jev completion gate with P >= 0.85 threshold.'
  },
  deception_vectors_observed: [
    {
      vector: 'Unverified test success claims',
      description: 'Agent claims "All tests pass with 0 failures" without executing tests, or when tests were skipped, mocked out, or failed.'
    },
    {
      vector: 'Phantom file/function modification claims',
      description: 'Agent claims to have created, updated, or fixed a file or function that does not exist in the working directory or was reverted in the shadow buffer.'
    },
    {
      vector: 'Overstated completion claims',
      description: 'Agent declares "100% complete / task solved" while explicit requirements from the user prompt remain unaddressed or unexecuted.'
    },
    {
      vector: 'False command success claims',
      description: 'Agent asserts a build, deployment, or script succeeded when stderr contained non-benign error logs or non-zero exit codes.'
    }
  ],
  proposed_layer: {
    name: 'Lie Detector Layer (Agent Statement vs Ground-Truth State Reconciliation)',
    mechanism: 'Intercepting the agent textual summary and final completion claims, extracting verifiable assertions, diffing claimed actions against ground-truth git diffs, file modifications, and test execution telemetry, and scoring semantic truthfulness and consistency using TypeSafe AI Jev.',
    execution_points: [
      'Hook 2 (postToolUse): verify per-tool assertions immediately after execution.',
      'Hook 3 (preExit): audit the final agent handoff message against cumulative session state.',
      'Hybrid: two-tier verification with deterministic telemetry diffing first, invoking Jev System One only on discrepancy or ambiguous semantic claims.'
    ]
  },
  architectural_tradeoffs: {
    token_cost: 'Passing agent textual transcripts, git diffs, and session telemetry to Jev consumes additional API tokens per completion or per tool call.',
    latency_overhead: 'Synchronous System One network call adds 200ms to 2000ms latency before agent can respond or terminate.',
    false_positives: 'Agent natural language variations, partial progress explanations, benign paraphrasing, or aspirational commentary could trigger false alarms and stall execution.',
    redundancy_with_acceptance_gate: 'Layer 4 (Acceptance Gate) already independently verifies physical test execution and exitCode == 0 regardless of what the agent says; Layer 3 already tracks physical file modifications in the shadow buffer.'
  }
};

const questions = {
  should_add_lie_detector: {
    type: 'noul',
    instructions: 'Should TypeSafe Aegis add an explicit Lie Detector Layer to reconcile agent textual statements against ground-truth system telemetry and physical workspace artifacts?',
    criteria: {
      true: 'Yes, an explicit statement-to-reality reconciliation layer is necessary to prevent deceptive claims, hallucinated completions, and false progress reporting from misleading users or orchestrators.',
      false: 'No, an explicit lie detector layer is unnecessary or counterproductive because physical ground-truth gates (like Layer 4 Acceptance Gate) already prevent false exits and ground-truth enforcement is superior to policing natural language.'
    }
  },
  optimal_architectural_form: {
    type: 'choice',
    instructions: 'What is the optimal architectural form for implementing agent statement-to-ground-truth reconciliation in Aegis?',
    criteria: {
      integrate_into_acceptance_gate: 'Integrate reconciliation directly into Layer 4 Acceptance Gate as an expanded pre-exit audit, reconciling the final handoff statement with test runner telemetry and git diffs before granting exit.',
      separate_response_auditor: 'Implement a dedicated standalone Layer 5 Response Auditor that intercepts all user-facing agent text and blocks or annotates deceptive claims before delivery.',
      post_tool_claim_checker: 'Implement inline claim checking inside Hook 2 (postToolUse) that validates per-tool claims immediately after each tool execution.',
      reject_as_redundant: 'Reject the concept as redundant; rely purely on deterministic physical verification gates (tests, diffs, exit codes) without analyzing agent conversational claims.'
    }
  },
  architectural_utility_rubric: {
    type: 'score',
    instructions: 'Score the architectural utility, value, and necessity of adding statement-vs-state reconciliation to Aegis.',
    criteria: [
      'Level 0: Superfluous or anti-pattern; adds latency and token cost with negligible defensive benefit over physical ground-truth gates.',
      'Level 1: Marginal utility; catches superficial conversational hallucinations but easily bypassed and risks high false positives.',
      'Level 2: High utility; meaningfully improves reliability, prevents user deception in autonomous workflows, and bridges the gap between agent statements and physical reality.',
      'Level 3: Critical and transformative; non-negotiable cognitive defense-in-depth layer essential for trustworthy autonomous operation.'
    ]
  },
  recommended_threshold_policy: {
    type: 'choice',
    instructions: 'What confidence threshold and gating policy should be used for auditing agent truthfulness to balance false alarms versus deception capture?',
    criteria: {
      calibrated_advisory_bipartite: 'Calibrated bipartite gating: Issue advisory warning/critique back into context if consistency is moderate (0.50 to 0.80); issue hard completion veto only on blatant contradictions (probability < 0.30) regarding verifiable facts.',
      strict_blocking_high_threshold: 'Strict completion gate: Hard fail and veto termination whenever truthfulness/consistency probability falls below 0.85.',
      deterministic_telemetry_veto_only: 'Deterministic veto only: Hard veto only when claimed facts directly contradict hard telemetry (e.g. tests pass claimed when exitCode != 0); treat semantic discrepancies as advisory warnings.',
      prompt_injection_correction_only: 'Non-blocking corrective feedback: Never block execution; inject detected discrepancies back into the agent context as an auto-correction prompt.'
    }
  },
  false_alarm_mitigation_strategy: {
    type: 'choice',
    instructions: 'What is the most effective architectural strategy for mitigating false positive lie detections caused by benign agent paraphrasing, partial progress summaries, or conversational nuance?',
    criteria: {
      two_tier_telemetry_linter: 'Two-tier verification: Run zero-token deterministic regex/telemetry checks on verifiable claims (files, tests, exit codes) first; invoke Jev System One only when a verifiable discrepancy exists or for high-stakes completion declarations.',
      ground_truth_assertion_diffing: 'Extract strictly verifiable factual assertions (file touched, test executed, exit code claimed) and verify against telemetry, completely ignoring subjective commentary and rhetorical narrative.',
      lenient_prompt_reflection: 'Provide a multi-turn clarification step where the agent is prompted to explain or resolve detected discrepancies before any veto is applied.',
      scope_limited_to_pre_exit: 'Restrict reconciliation exclusively to the final pre-exit completion claim, completely ignoring intermediate thoughts and progress commentary.'
    }
  },
  two_tier_hybrid_architecture: {
    type: 'noul',
    instructions: 'Should Aegis enforce a two-tier hybrid architecture where zero-token deterministic diff/telemetry parsing runs first, and Jev System One is only invoked when discrepancies or semantic claims are detected?',
    criteria: {
      true: 'Yes, a two-tier hybrid architecture is optimal because it achieves 0 token cost and sub-millisecond latency for honest/compliant runs, reserving Jev System One calls for ambiguous or conflicting claims.',
      false: 'No, all claims should be evaluated either purely deterministically without Jev, or Jev should evaluate every response unconditionally.'
    }
  }
};

async function evaluateLieDetectorLayer() {
  console.log('Dispatching architectural evaluation request to Jev System One...\n');
  const startTime = Date.now();

  try {
    const response = await callJevSystemOne({
      state: architecturalState,
      questions,
      timeoutMs: 25000
    });
    const elapsed = Date.now() - startTime;

    console.log(`Received Jev System One response in ${elapsed}ms\n`);
    console.log('Raw Model:', response.model);
    console.log('Token Usage:', response.usage);
    console.log('\n================================================================================');
    console.log('JEV SYSTEM ONE ADJUDICATION RESULTS');
    console.log('================================================================================\n');

    const answers = response.answers || {};

    const q1 = answers.should_add_lie_detector || {};
    const q2 = answers.optimal_architectural_form || {};
    const q3 = answers.architectural_utility_rubric || {};
    const q4 = answers.recommended_threshold_policy || {};
    const q5 = answers.false_alarm_mitigation_strategy || {};
    const q6 = answers.two_tier_hybrid_architecture || {};

    console.log(`1. Add Lie Detector Layer (noul): ${q1.noul} -> ${q1.noul >= 0.5 ? 'YES / APPROVED' : 'NO / REJECTED'}`);
    console.log(`2. Optimal Architectural Form (choice): ${q2.choice}`);
    console.log('   Probabilities:', JSON.stringify(q2.probabilities, null, 2));
    console.log(`3. Utility Rubric Score (score): ${q3.score} / 3.00`);
    console.log(`   Description: ${q3.legend?.[Math.round(q3.score)] || ''}`);
    console.log(`4. Recommended Threshold Policy (choice): ${q4.choice}`);
    console.log('   Probabilities:', JSON.stringify(q4.probabilities, null, 2));
    console.log(`5. False Alarm Mitigation Strategy (choice): ${q5.choice}`);
    console.log('   Probabilities:', JSON.stringify(q5.probabilities, null, 2));
    console.log(`6. Two-Tier Hybrid Architecture (noul): ${q6.noul} -> ${q6.noul >= 0.5 ? 'YES / APPROVED' : 'NO / REJECTED'}`);

    const resultPayload = {
      timestamp: new Date().toISOString(),
      model: response.model,
      elapsed_ms: elapsed,
      usage: response.usage,
      architectural_state: architecturalState,
      answers: {
        should_add_lie_detector: {
          approved: q1.noul >= 0.5,
          probability: q1.noul,
          confidence: Math.round(Math.abs(q1.noul - 0.5) * 2 * 100) / 100
        },
        optimal_architectural_form: {
          choice: q2.choice,
          probabilities: q2.probabilities
        },
        architectural_utility_rubric: {
          score: q3.score,
          description: q3.legend?.[Math.round(q3.score)] || ''
        },
        recommended_threshold_policy: {
          choice: q4.choice,
          probabilities: q4.probabilities
        },
        false_alarm_mitigation_strategy: {
          choice: q5.choice,
          probabilities: q5.probabilities
        },
        two_tier_hybrid_architecture: {
          approved: q6.noul >= 0.5,
          probability: q6.noul,
          confidence: Math.round(Math.abs(q6.noul - 0.5) * 2 * 100) / 100
        }
      }
    };

    const outPath = path.join(rootDir, 'test', 'lie-detector-adjudication.json');
    fs.writeFileSync(outPath, JSON.stringify(resultPayload, null, 2), 'utf8');
    console.log(`\nAdjudication saved successfully to: ${outPath}`);

  } catch (err) {
    console.error('Error querying Jev System One:', err);
    process.exit(1);
  }
}

evaluateLieDetectorLayer();
