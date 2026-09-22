import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const interceptorSrc = fs.readFileSync(path.join(root, 'harness', 'interceptor.js'), 'utf8');
const acceptanceGateSrc = fs.readFileSync(path.join(root, 'harness', 'acceptance-gate.js'), 'utf8');

const preToolCode = interceptorSrc.slice(
  interceptorSrc.indexOf('export async function runInterceptor()'),
  interceptorSrc.indexOf('// HOOK 2: POST-TOOL USE')
);

const postToolCode = interceptorSrc.slice(
  interceptorSrc.indexOf('// HOOK 2: POST-TOOL USE'),
  interceptorSrc.indexOf('// HOOK 3: VERIFY GATE')
);

const acceptanceGateCode = acceptanceGateSrc.slice(
  acceptanceGateSrc.indexOf('export async function verifyAcceptanceGate('),
  acceptanceGateSrc.indexOf('// CLI entrypoint if executed directly')
);

const tests = [
  {
    name: '1. PreTool Hook Interception Architecture',
    state: preToolCode,
    question: {
      id: 'q1_pretool',
      instructions: 'In runInterceptor pre-tool mode, does the harness enforce defense-in-depth before allowing a tool call to proceed: (1) resolves stable session_id from stdin, (2) blocks unauthorized credential access, (3) blocks repetitive thrashing cycles via checkCycle, (4) checks core law AST invariants, and (5) isolates destructive operations for Jev vetting with fail-closed exit if vetoed?',
      criteria_true: 'Verified: The pre-tool dispatcher enforces credential guards, cycle detection, code invariant linting, and isolated destructive vetting before allowing execution.',
      criteria_false: 'The pre-tool dispatcher does not implement these security checks or allows operations to proceed without vetting.'
    }
  },
  {
    name: '2. PostTool Hook Test Status Capture',
    state: postToolCode,
    question: {
      id: 'q2_posttool',
      instructions: 'In post-tool mode, does the harness inspect test runner commands matching TEST_RUNNER_PATTERN and update session.lastTestPassed based on the test runner exit status and output failure markers?',
      criteria_true: 'Verified: Post-tool tracks test runner execution and populates session.lastTestPassed accordingly.',
      criteria_false: 'Post-tool does not track test runner outcomes.'
    }
  },
  {
    name: '3. Stop Hook Acceptance Gate Ordering',
    state: acceptanceGateCode,
    question: {
      id: 'q3_gate_pipeline',
      instructions: 'In verifyAcceptanceGate, for workspaces with a test contract, is Stage 1 deterministic test execution (executeTestCommand) required to exit with code 0 before Stage 2 Jev semantic evaluation is invoked?',
      criteria_true: 'Verified: Stage 1 test runner executes deterministically first; non-zero exit codes fail at Stage 1, and Stage 2 Jev evaluation requires exitCode === 0.',
      criteria_false: 'Stage 2 Jev evaluation runs before tests or ignores non-zero test runner exit codes.'
    }
  },
  {
    name: '4. Single Authoritative Decision Metric (gate_confidence)',
    state: acceptanceGateCode,
    question: {
      id: 'q4_gate_confidence',
      instructions: 'In verifyAcceptanceGate return payload, is gate_confidence provided as the single authoritative confidence metric for downstream decision systems, with raw model usage and probability fields preserved as supplementary audit metadata?',
      criteria_true: 'Verified: gate_confidence is documented and returned as the authoritative gate metric, while usage and raw probability are supplementary audit metadata.',
      criteria_false: 'gate_confidence is not returned or multiple conflicting numbers are presented without an authoritative designation.'
    }
  }
];

const results = [];

for (const t of tests) {
  console.log(`Evaluating: ${t.name}...`);
  const response = await callJevSystemOne({
    state: t.state,
    questions: {
      [t.question.id]: {
        type: 'noul',
        instructions: t.question.instructions,
        criteria: {
          true: t.question.criteria_true,
          false: t.question.criteria_false
        }
      }
    },
    timeoutMs: 20000
  });

  const noul = response.answers?.[t.question.id]?.noul;
  console.log(`  Jev noul: ${noul} -> ${noul >= 0.70 ? 'VERIFIED TRUE' : 'UNCERTAIN/FALSE'}`);
  results.push({ name: t.name, id: t.question.id, noul, answer: response.answers?.[t.question.id] });
}

console.log('\n================================================================================');
console.log('FINAL JEV VERIFICATION OF HARNESS LIFECYCLE ARCHITECTURE');
console.log('================================================================================');
for (const r of results) {
  console.log(`- ${r.name.padEnd(48)}: noul = ${r.noul} (${r.noul >= 0.70 ? 'VERIFIED ACCURATE' : 'UNCERTAIN'})`);
}

const outPath = path.join(root, 'test', 'jev-step-by-step-verification.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
