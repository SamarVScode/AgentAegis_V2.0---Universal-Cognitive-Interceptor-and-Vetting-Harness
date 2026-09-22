import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Gather core files for state context (bounded for token limit)
const interceptorSrc = fs.readFileSync(path.join(root, 'harness', 'interceptor.js'), 'utf8');
const acceptanceGateSrc = fs.readFileSync(path.join(root, 'harness', 'acceptance-gate.js'), 'utf8');
const stateCollectorSrc = fs.readFileSync(path.join(root, 'harness', 'state-collector.js'), 'utf8');
const cycleDetectorSrc = fs.readFileSync(path.join(root, 'harness', 'cycle-detector.js'), 'utf8');

const stateContext = `
=== HARNESS ARCHITECTURE CORE EXCERPTS ===

--- 1. interceptor.js (Session resolution & PreToolUse / PostToolUse / Stop dispatch) ---
${interceptorSrc.slice(0, 3200)}

--- 2. state-collector.js (7-Pillar Precision Context Collection) ---
${stateCollectorSrc.slice(0, 2800)}

--- 3. acceptance-gate.js (3-Stage Verification Pipeline) ---
${acceptanceGateSrc.slice(0, 3200)}
`.slice(0, 9000);

const stepByStepExplanation = `
Step 1: User Prompt Ingestion.
The user enters a task in Claude Code, Cursor, or Antigravity. The agent plans actions and proposes an actuator tool call (e.g. replace_file_content or run_command).

Step 2: PreToolUse Interception & Deterministic Pre-Gates.
Before the agent tool executes, the engine invokes harness/interceptor.js with pre-tool.
- Reads stdin once to resolve stdinPayload.session_id (eliminating session fragmentation).
- Synchronous checks: isSensitivePath() rejects .env / private keys; isDestructiveAction() detects rm -rf, git reset, DROP TABLE in <1ms.
- Cycle Detection: checkCycle() checks 3-turn repeated diffs and blocks thrashing.
- Destructive Vetting: If destructive, collects 7-pillars state and calls Jev System One; exits 2 if rejected, exits 0 if approved.
- Decision Audit: recordDecision() appends decision and 7-pillars context into .aegis/decision-audit.jsonl.

Step 3: Actuator Tool Execution & PostToolUse Telemetry Capture.
If allowed, the agent executes the tool. On tool completion, PostToolUse hook fires into interceptor.js post-tool:
- Matches test runner execution (npm test, pytest, cargo test, etc.).
- Inspects exit code and output failure markers to set session.lastTestPassed = true/false.

Step 4: Stop Hook & 3-Stage Acceptance Gate.
When the agent declares completion, the Stop hook invokes verifyAcceptanceGate():
- Deterministic Auth Pre-Gate: RESTRICTED_PATTERNS check runs synchronously to prevent destructive payloads.
- Stage 1 (Deterministic Runner Execution): Executes the project test suite (e.g. npm test) via safeSpawnAsync. If tests fail (non-zero exit code), immediately vetoes completion without consulting Jev.
- Stage 1.5 (Claim-to-Reality Reconciliation): Cross-references agent claims against disk reality (e.g. confirming modified files actually exist on disk).
- Stage 2 (Jev Semantic Completion Gate): If Stage 1 and 1.5 pass, Jev System One evaluates whether the test completion and user intent contract are satisfied, outputting single authoritative gate_confidence.
`;

async function verifyExplanationWithJev() {
  console.log('Sending Step-by-Step Architectural Flow to Jev System One for Verification...\n');

  const response = await callJevSystemOne({
    state: stateContext,
    questions: {
      step_by_step_flow_accuracy: {
        type: 'noul',
        instructions: `Does the following step-by-step description accurately and truthfully describe the execution flow of the AgentAegis harness from prompt ingestion to final verified output based on the codebase?\n\n${stepByStepExplanation}`,
        criteria: {
          true: 'The explanation is accurate: correctly details PreToolUse deterministic pre-gates, session stabilization, cycle detection, PostToolUse test capture, Stage 1 deterministic test execution, Stage 1.5 claim reconciliation, and Stage 2 Jev semantic gate with gate_confidence.',
          false: 'The explanation is inaccurate: misrepresents the order of operations, invents non-existent stages, or contradicts the codebase implementation.'
        }
      },
      security_and_gate_ordering: {
        type: 'noul',
        instructions: 'Does the explanation correctly state that deterministic verification (Stage 1 test runner exitCode === 0) and authorization pre-gates happen BEFORE Jev semantic verification rather than relying solely on model guesses?',
        criteria: {
          true: 'Correct: Stage 1 deterministic execution and deterministic auth pre-gates act as the primary gating mechanism before Stage 2 Jev evaluation.',
          false: 'Incorrect: The explanation claims Jev evaluates completion before tests run or that security relies purely on probabilistic model decisions.'
        }
      }
    },
    timeoutMs: 25000
  });

  console.log('Jev Adjudication Answers:');
  console.log(JSON.stringify(response.answers, null, 2));

  const noulFlow = response.answers?.step_by_step_flow_accuracy?.noul;
  const noulOrdering = response.answers?.security_and_gate_ordering?.noul;

  console.log('\nResults Summary:');
  console.log(`Flow Accuracy Score        : ${noulFlow} (${noulFlow >= 0.75 ? 'VERIFIED ACCURATE' : 'UNCERTAIN/INACCURATE'})`);
  console.log(`Gate Ordering Rigor Score  : ${noulOrdering} (${noulOrdering >= 0.75 ? 'VERIFIED ACCURATE' : 'UNCERTAIN/INACCURATE'})`);

  const outPath = path.join(root, 'test', 'jev-architecture-flow-verification.json');
  fs.writeFileSync(outPath, JSON.stringify(response, null, 2));
  console.log('Saved Jev verification response to:', outPath);
}

verifyExplanationWithJev().catch(err => {
  console.error('[FAIL] Jev verification error:', err);
  process.exit(1);
});
