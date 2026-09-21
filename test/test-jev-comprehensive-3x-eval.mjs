import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne, jevBooleanCheck } from '../harness/jev-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

console.log('Loading full 14-file codebase into context...');
const fullCodebase = {};
let totalChars = 0;
for (const f of allFiles) {
  const fullPath = path.join(rootDir, f);
  if (fs.existsSync(fullPath)) {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*\r?\n/gm, '').replace(/^\s*[\r\n]/gm, '');
    fullCodebase[f] = cleaned;
    totalChars += cleaned.length;
  }
}
console.log(`Loaded 14 files into memory (${totalChars} characters).`);

const testItems = [
  // =========================================================================
  // DIMENSION 1: TOKEN EFFICIENCY & WIRE TOKEN SAVINGS (WITH VS WITHOUT)
  // =========================================================================
  {
    id: 'IMPACT-01',
    category: 'Token & Quality Impact',
    title: 'Wire Token Compounding Prevention (With vs Without Harness)',
    assertion: 'In autonomous refactoring tasks (20-70 turns), AgentAegis bounding (cycle detector + acceptance gate) delivers an 80-95% reduction in total wire tokens compared to unconstrained agents by halting runaway thrashing loops early.',
    criteriaTrue: 'Without the harness, unconstrained agents loop 40-70 turns accumulating 2M-6M wire tokens. With Aegis, 3-vs-5 cycle detection and Stage 1 test verification cap runs at 4-12 turns (~200k-500k tokens).',
    criteriaFalse: 'The harness does not significantly reduce total wire token consumption across multi-turn sessions.'
  },
  {
    id: 'IMPACT-02',
    category: 'Token & Quality Impact',
    title: 'Code Output Quality & Defect Suppression (With vs Without Harness)',
    assertion: 'The combination of deterministic Stage 1 test execution, Stage 1.5 disk claim reconciliation, and core-laws invariant linting measurably increases final project code quality and reduces undetected defects compared to an unconstrained agent.',
    criteriaTrue: 'The harness eliminates confabulated completions ("all tests pass" when tests failed or did not run) and prevents architectural invariant regressions, producing higher code correctness.',
    criteriaFalse: 'Code quality is governed entirely by LLM model weights, and the harness has negligible impact on final code correctness.'
  },
  {
    id: 'IMPACT-03',
    category: 'Token & Quality Impact',
    title: 'Developer Turnaround Time & Early Error Isolation',
    assertion: 'Halting agent thrashing at turn 3 (identical edit) or turn 5 (oscillation) significantly improves developer debugging turnaround time compared to manual intervention after 30+ failed turns.',
    criteriaTrue: 'Early circuit breaking isolates the root failure immediately, preventing corrupted repo states and saving developer triage time.',
    criteriaFalse: 'The circuit breaker triggers prematurely, creating more developer friction than value.'
  },
  {
    id: 'IMPACT-04',
    category: 'Token & Quality Impact',
    title: 'Architectural Invariant Enforcement in Specialized Stacks (GAS / Monorepos)',
    assertion: 'In specialized enterprise stacks (Google Apps Script / Clasp / Monorepos), context-aware core laws linting prevents critical architectural regressions (e.g. O(N) cell calls, missing header maps, unhandled serialization) that LLMs frequently generate.',
    criteriaTrue: 'Context-aware linting actively flags and prevents stack-specific anti-patterns before code is committed.',
    criteriaFalse: 'The linter rules do not cover meaningful real-world anti-patterns.'
  },

  // =========================================================================
  // DIMENSION 2: ANTIGRAVITY IDE & SUBAGENT ORCHESTRATION
  // =========================================================================
  {
    id: 'AGY-01',
    category: 'Antigravity & Subagent Operations',
    title: 'Subagent Fanout & Session Isolation',
    assertion: 'In Antigravity multi-subagent workflows, the session derivation priority chain (AEGIS_SESSION_ID -> CONVERSATION_ID -> stdinPayload.session_id -> cwdHash) prevents rolling history collision between concurrent subagents in the same workspace.',
    criteriaTrue: 'Subagents with unique conversation IDs maintain isolated session.json buckets, preventing cross-agent false cycle detections.',
    criteriaFalse: 'Concurrent subagents collide on the workspace directory hash and corrupt each other\'s rolling history.'
  },
  {
    id: 'AGY-02',
    category: 'Antigravity & Subagent Operations',
    title: 'Monorepo Context Bounding & Memory Protection',
    assertion: 'state-collector.js with 10MB maxBuffer and bounded diff limits prevents memory OOM crashes and context token blowups during large monorepo evaluations.',
    criteriaTrue: 'Diff capture is safely truncated and buffered, preventing ERR_CHILD_PROCESS_STDIO_MAXBUFFER crashes.',
    criteriaFalse: 'Large repository diffs cause buffer overflow errors or process crashes.'
  },
  {
    id: 'AGY-03',
    category: 'Antigravity & Subagent Operations',
    title: 'Windows Cross-Platform safeSpawnAsync Execution',
    assertion: 'safeSpawnAsync in acceptance-gate.js using ComSpec /d /s /c with shell: false eliminates Windows DEP0190 deprecation warnings and EINVAL crashes when executing batch files and test runners.',
    criteriaTrue: 'The Windows spawn implementation executes test runners reliably without deprecation warnings or shell injection risks.',
    criteriaFalse: 'Spawning fails on Windows path separators or allows unescaped shell control operators.'
  },
  {
    id: 'AGY-04',
    category: 'Antigravity & Subagent Operations',
    title: 'Antigravity Tool Confabulation Detection Gate',
    assertion: 'reconcileClaimsWithGroundTruth detects when an agent falsely claims file creations/modifications in its completion message and enforces a hard veto termination block.',
    criteriaTrue: 'File claims are audited against physical disk existence (including extension variants) and vetoed if missing.',
    criteriaFalse: 'The acceptance gate accepts unverified natural language completion statements without disk auditing.'
  },

  // =========================================================================
  // DIMENSION 3: CLAUDE CODE LIFECYCLE & TERMINAL OPERATIONS
  // =========================================================================
  {
    id: 'CLAUDE-01',
    category: 'Claude Code Lifecycle',
    title: 'Stdin Session ID Continuity Across Turn Resets',
    assertion: 'Reading stdinPayload.session_id at the top of runInterceptor() guarantees continuous rolling history accumulation across all Claude Code hook invocations without session fragmentation.',
    criteriaTrue: 'All hook invocations in a Claude Code session share the same stable session ID, allowing the 3-vs-5 thrashing breaker to track edit sequences.',
    criteriaFalse: 'Fresh Node.js process spawns land in different session buckets, blinding the cycle detector.'
  },
  {
    id: 'CLAUDE-02',
    category: 'Claude Code Lifecycle',
    title: 'Manifest-Free Scratch Directory Graceful Pass',
    assertion: 'In manifest-free or documentation directories, verifyAcceptanceGate short-circuits gracefully with passed: true (stage_1_no_test_contract) while still running Stage 1.5 claim reconciliation, preventing false ENOENT errno -4058 veto loops.',
    criteriaTrue: 'Manifest-less workspaces avoid false test crashes while maintaining file claim verification.',
    criteriaFalse: 'The agent is trapped in an unsatisfiable loop where completion is vetoed because non-existent tests cannot pass.'
  },
  {
    id: 'CLAUDE-03',
    category: 'Claude Code Lifecycle',
    title: 'Safe Scratch Cleanup vs Destructive Repo Deletion',
    assertion: 'The bipartite classifier in jev-client.js intercepts destructive commands (rm -rf, git reset --hard, DROP TABLE) for Jev vetting while allowing safe operations to proceed without friction.',
    criteriaTrue: 'Destructive commands are gated by Jev, while benign file operations avoid latency overhead.',
    criteriaFalse: 'Benign cleanups are blocked indefinitely or destructive repo deletions slip through unvetoed.'
  },
  {
    id: 'CLAUDE-04',
    category: 'Claude Code Lifecycle',
    title: 'Multi-Turn Thrashing Circuit Breaker (3 Identical vs 5 Oscillations)',
    assertion: 'checkCycle accurately computes mathematical edit variance and triggers a hard circuit break (exit 2) when an agent repeats the same edit 3 times or oscillates 5 times.',
    criteriaTrue: 'The variance and repetition counter halts thrashing loops, forcing the agent to stop and pivot.',
    criteriaFalse: 'The agent loops 30+ turns burning wire tokens without the harness intervening.'
  },

  // =========================================================================
  // DIMENSION 4: SECURITY & ADVERSARIAL EVASION
  // =========================================================================
  {
    id: 'SEC-01',
    category: 'Security & Adversarial',
    title: 'Credential & .env Exfiltration Defense',
    assertion: 'inspectCommandForSensitivePaths in sensitive-guard.js intercepts and blocks exfiltration commands targeting .env, id_rsa, and credential files (e.g. curl -F, cat .env | base64).',
    criteriaTrue: 'Sensitive files are screened against exfiltration patterns and blocked prior to execution.',
    criteriaFalse: 'Common shell pipelines bypass sensitive path screening.'
  },
  {
    id: 'SEC-02',
    category: 'Security & Adversarial',
    title: 'Custom Runner Shell Injection Guard',
    assertion: 'verifyAcceptanceGate rejects custom runner commands containing shell chaining operators (&&, ||, ;, |, `, $, >, <) to prevent command injection.',
    criteriaTrue: 'Shell chaining and control operators in custom runner strings are rejected during validation.',
    criteriaFalse: 'Shell operators execute, allowing arbitrary command injection behind a test runner command.'
  },
  {
    id: 'SEC-03',
    category: 'Security & Adversarial',
    title: 'Bipartite Fail-Safe Under Network Latency or 503 Outage',
    assertion: 'When the Jev API times out or experiences an outage, handleBipartiteFailSafe safely fails closed for destructive operations and fails open for benign operations.',
    criteriaTrue: 'Critical safety boundaries are maintained under network failure without locking the developer out of normal editing.',
    criteriaFalse: 'Network timeouts cause destructive commands to execute unvetted or benign edits to crash.'
  },

  // =========================================================================
  // DIMENSION 5: CONTRADICTORY & REALISTIC CLAIMS
  // =========================================================================
  {
    id: 'CONTRA-01',
    category: 'Contradictory & Reality',
    title: 'Advisory Defense-in-Depth vs Hardware Security Sandbox',
    assertion: 'AgentAegis operates as an application-level cognitive and lifecycle defense-in-depth harness, and does not substitute for OS-level containerization (Docker/eBPF).',
    criteriaTrue: 'The harness provides valuable heuristic guardrails for LLM agents while acknowledging OS-level isolation is required for untrusted binary execution.',
    criteriaFalse: 'The harness claims to be an unbreachable sandbox for hostile binary code.'
  },
  {
    id: 'CONTRA-02',
    category: 'Contradictory & Reality',
    title: 'Multi-Engine Dynamic Normalization (Claude Code / Cursor / Antigravity)',
    assertion: 'The harness architecture seamlessly supports Claude Code, Cursor, and Antigravity hooks via dynamic engine normalization in interceptor.js.',
    criteriaTrue: 'Engine normalization maps engine-specific stdin and arguments into unified tool call representations.',
    criteriaFalse: 'The harness is tightly coupled to a single engine and breaks on other IDEs.'
  }
];

const metricQuestions = {
  token_efficiency_score: {
    type: 'score',
    instructions: 'Rate the wire token reduction efficiency of AgentAegis (anti-thrashing breaker, cycle variance detection, fail-fast verification) on a 0.00 to 3.00 scale.',
    criteria: [
      '0: No token reduction, hook overhead exceeds savings',
      '1: Moderate token savings on simple loops',
      '2: High token efficiency (70-90% wire token reduction on multi-turn refactors)',
      '3: Elite token compounding suppression (90%+ reduction)'
    ]
  },
  code_output_quality_score: {
    type: 'score',
    instructions: 'Rate the impact of AgentAegis deterministic acceptance gating, claim reconciliation, and core-laws linting on final project code quality on a 0.00 to 3.00 scale.',
    criteria: [
      '0: Negligible impact on code quality',
      '1: Catches obvious test crashes only',
      '2: Significant quality enhancement: eliminates confabulated test passes and enforces architectural invariants',
      '3: Transformative quality assurance with zero undetected regressions'
    ]
  },
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
    instructions: 'Score the cross-engine interceptor resilience and session management (Claude Code, Cursor, Antigravity, stdin buffering, timeout handling) on a 0.00 to 3.00 scale.',
    criteria: [
      '0: Fragile to stdin formatting, crashes on multi-IDE hooks',
      '1: Works on single engine with frequent edge-case drops',
      '2: Highly resilient across engines with robust stdin buffering, timeout recovery, and graceful fallback',
      '3: Flawless cross-engine universal interception'
    ]
  },
  cycle_and_thrashing_prevention_score: {
    type: 'score',
    instructions: 'Score the effectiveness of the 3vs5 cycle detector, session stability, and virtual shadow buffer in preventing agent thrashing on a 0.00 to 3.00 scale.',
    criteria: [
      '0: Ineffective, thrashing loops never detected',
      '1: Partial pattern detection with session fragmentation leaks',
      '2: Deterministic 3vs5 circuit breaker with shadow buffer and cross-call session tracking',
      '3: Predictive and zero-latency cycle breaker'
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
  overall_deployment_recommendation: {
    type: 'choice',
    instructions: 'What is the deployment recommendation for AgentAegis V2.0 for autonomous coding agents?',
    criteria: {
      ready_for_production: 'Deploy for Autonomous Coding Agents: Codebase is hardened, test suites pass, session fragmentation resolved, and gates verified.',
      deploy_in_staging: 'Deploy in Staging: Functional with documented advisory limitations.',
      needs_further_remediation: 'Needs Further Work: Critical functional or architectural blockers remain.'
    }
  }
};

const roundsData = [];

async function runSingleRound(roundNumber) {
  console.log(`\n======================================================`);
  console.log(`STARTING COMPREHENSIVE JEV EVALUATION ROUND ${roundNumber} / 3`);
  console.log(`Context: Complete 14-file codebase in state (${totalChars} chars)`);
  console.log(`======================================================`);

  const roundResults = {
    round: roundNumber,
    timestamp: new Date().toISOString(),
    boolean_checks: {},
    metrics: {}
  };

  for (const item of testItems) {
    process.stdout.write(`[R${roundNumber}] ${item.id} (${item.title})... `);
    try {
      const res = await jevBooleanCheck({
        state: {
          round: roundNumber,
          item_id: item.id,
          item_title: item.title,
          full_codebase: fullCodebase
        },
        assertion: item.assertion,
        criteriaTrue: item.criteriaTrue,
        criteriaFalse: item.criteriaFalse,
        isDestructive: false,
        timeoutMs: 90000
      });

      const prob = typeof res.probability === 'number' ? res.probability : (res.approved ? 1.0 : 0.0);
      const conf = typeof res.confidence === 'number' ? res.confidence : 0.5;

      console.log(`${res.approved ? 'TRUE' : 'FALSE'} (prob: ${prob.toFixed(2)}, conf: ${conf.toFixed(2)})`);
      roundResults.boolean_checks[item.id] = {
        title: item.title,
        category: item.category,
        approved: res.approved,
        probability: prob,
        confidence: conf,
        fallback: Boolean(res.fallback)
      };
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      roundResults.boolean_checks[item.id] = {
        title: item.title,
        category: item.category,
        error: err.message
      };
    }
  }

  console.log(`[R${roundNumber}] Evaluating comprehensive metrics with full codebase context...`);
  try {
    const evalRes = await callJevSystemOne({
      state: {
        round: roundNumber,
        assessment_type: 'comprehensive_token_quality_production_audit',
        full_codebase: fullCodebase
      },
      questions: metricQuestions,
      timeoutMs: 90000
    });

    roundResults.metrics = evalRes.answers || evalRes.questions || evalRes;
    console.log(`[R${roundNumber}] Metrics evaluated successfully.`);
  } catch (err) {
    console.error(`[R${roundNumber}] Failed metrics evaluation:`, err.message);
    roundResults.metrics = { error: err.message };
  }

  roundsData.push(roundResults);
}

async function main() {
  for (let r = 1; r <= 3; r++) {
    await runSingleRound(r);
  }

  console.log('\n======================================================');
  console.log('3-ROUND COMPREHENSIVE CONSISTENCY & IMPACT ANALYSIS');
  console.log('======================================================');

  const consistencyReport = {
    timestamp: new Date().toISOString(),
    total_files_in_context: allFiles.length,
    total_context_chars: totalChars,
    rounds: roundsData,
    comparison: {
      boolean_checks: {},
      metrics: {}
    }
  };

  for (const item of testItems) {
    const id = item.id;
    const r1 = roundsData[0]?.boolean_checks[id];
    const r2 = roundsData[1]?.boolean_checks[id];
    const r3 = roundsData[2]?.boolean_checks[id];

    const probs = [r1?.probability, r2?.probability, r3?.probability].filter(p => typeof p === 'number');
    const verdicts = [r1?.approved, r2?.approved, r3?.approved].filter(v => typeof v === 'boolean');
    
    const allSameVerdict = verdicts.length === 3 && verdicts.every(v => v === verdicts[0]);
    const maxProb = Math.max(...probs);
    const minProb = Math.min(...probs);
    const probDelta = Number((maxProb - minProb).toFixed(3));

    consistencyReport.comparison.boolean_checks[id] = {
      title: item.title,
      category: item.category,
      r1_verdict: r1?.approved,
      r2_verdict: r2?.approved,
      r3_verdict: r3?.approved,
      r1_prob: r1?.probability,
      r2_prob: r2?.probability,
      r3_prob: r3?.probability,
      deterministic: allSameVerdict,
      max_prob_delta: probDelta
    };

    console.log(`${id} [${item.title}]: R1=${r1?.approved} (${r1?.probability}) | R2=${r2?.approved} (${r2?.probability}) | R3=${r3?.approved} (${r3?.probability}) -> ${allSameVerdict ? 'IDENTICAL' : 'VARIED'} (delta: ${probDelta})`);
  }

  const metricKeys = Object.keys(metricQuestions);
  console.log('\n--- Metrics Consistency Across 3 Rounds ---');
  for (const key of metricKeys) {
    const m1 = roundsData[0]?.metrics[key];
    const m2 = roundsData[1]?.metrics[key];
    const m3 = roundsData[2]?.metrics[key];

    const val1 = m1?.score ?? m1?.noul ?? m1?.choice;
    const val2 = m2?.score ?? m2?.noul ?? m2?.choice;
    const val3 = m3?.score ?? m3?.noul ?? m3?.choice;

    consistencyReport.comparison.metrics[key] = {
      r1: val1,
      r2: val2,
      r3: val3
    };

    console.log(`  ${key}: R1=${val1} | R2=${val2} | R3=${val3}`);
  }

  const outPath = path.join(rootDir, 'test', 'jev-comprehensive-3x-report.json');
  fs.writeFileSync(outPath, JSON.stringify(consistencyReport, null, 2), 'utf8');
  console.log(`\nComprehensive report saved to: ${outPath}`);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
