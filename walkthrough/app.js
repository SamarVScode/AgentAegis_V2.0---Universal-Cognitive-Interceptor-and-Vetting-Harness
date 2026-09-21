/**
 * AgentAegis Official Walkthrough Controller
 * High-prestige interactive logic: 3-Way Benchmark, Token Physics, CLI Sandbox, Architecture Stepper
 * ZERO EMOJIS in all code and string outputs.
 */

document.addEventListener('DOMContentLoaded', () => {
  initArchitectureStepper();
  initBenchmarkArena();
  initTokenPhysicsCalculator();
  initTerminalSandbox();
  initEngineTabs();
  initCopyButtons();
});

/* -------------------------------------------------------------------------
 * ARCHITECTURE LIFECYCLE STEPPER
 * ------------------------------------------------------------------------- */
const STAGES = {
  1: {
    tag: 'HOOK: preToolUse / pre-tool',
    status: '[ACTIVE: BLOCKING MODE]',
    name: 'Stage 1: PreTool Hook Interception',
    desc: 'Intercepts every tool call before disk mutation or shell execution occurs. Evaluates arguments against destructive action filters (isDestructiveAction) and secret credential guards (sensitive-guard.js). Issues Exit Code 2 with a safety veto on destructive operations.',
    features: [
      { key: 'Execution Speed', val: 'Under 1.2ms (Zero network overhead fastpath)' },
      { key: 'Invariant Linter', val: 'Static pattern scan for eval, private keys, and prototype pollution' },
      { key: 'Destructive Veto', val: 'Instant fail-closed veto (Exit Code 2) on destructive commands' }
    ],
    previewTitle: 'harness/interceptor.js [preToolUse]',
    code: `// Intercept incoming tool invocation
const isDestructive = isDestructiveAction(toolName, toolArgs);
if (isDestructive) {
  process.stderr.write("[JEV SAFETY VETO]: Destructive command pattern blocked.\\n");
  process.exit(2);
}

// Static code invariants linter
const linterRes = lintCoreLaws(toolArgs.CodeContent || toolArgs.code || "");
if (!linterRes.clean) {
  process.stderr.write(\`[CORE LAWS VETO]: \${linterRes.violations.join(", ")}\\n\`);
  process.exit(2);
}`
  },
  2: {
    tag: 'MODULE: cycle-detector.js',
    status: '[ACTIVE: THRESHOLD=3-5]',
    name: 'Stage 2: Cycle Detector & Diff Variance',
    desc: 'Maintains an atomic rolling session history and Levenshtein diff variance analyzer. Reconstructs a disk-backed virtual shadow buffer for partial edits. Trips the circuit breaker on turn 3 for low-variance edits (<15%) and turn 5 for substantive edits (>=15%).',
    features: [
      { key: 'Dynamic Threshold', val: 'Hard trip at 3 repeats (<15% variance) or 5 repeats (>=15% variance)' },
      { key: 'Shadow Buffer', val: 'Disk-backed virtual assembly in .aegis-harness/<sessionId>/shadow/' },
      { key: 'Supervisor Throttle', val: 'Warns at 3 polls, hard veto at 5 polls to enforce reactive wakeups' }
    ],
    previewTitle: 'harness/cycle-detector.js [checkCycle]',
    code: `// Evaluate rolling tool sequence and diff variance
const cycle = checkCycle(sessionId, toolName, toolArgs);
if (cycle.tripped) {
  process.stderr.write("[THRASHER DETECTED]: Repetitive sequence detected.\\n");
  process.stderr.write(\`[CIRCUIT BREAKER]: \${cycle.reason}\\n\`);
  saveSession(sessionId, { tripped: true });
  process.exit(2);
}`
  },
  3: {
    tag: 'MODULE: state-collector.js',
    status: '[ACTIVE: ADAPTIVE ENVELOPE]',
    name: 'Stage 3: Ground Truth State Collector',
    desc: 'Gathers git worktree status, diff stats, and stderr tails with a 10MB maxBuffer ceiling. Automatically excludes lockfiles to prevent buffer saturation. Compresses tool arguments exceeding 600 characters into 8-character SHA-256 fingerprints.',
    features: [
      { key: 'Ground Truth Source', val: 'Direct git status, diff stats, and execution exit codes' },
      { key: 'Monorepo Protection', val: '10MB maxBuffer limit and automatic lockfile exclusion' },
      { key: 'Context Bounding', val: 'Diffs bounded between 1,200 - 2,500 chars; SHA-256 arg hashing' }
    ],
    previewTitle: 'harness/state-collector.js [collectState]',
    code: `// Collect ground-truth state without context compounding
export function collectState(workspaceRoot) {
  const gitStatus = execSync("git status --porcelain", { cwd: workspaceRoot, maxBuffer: 10 * 1024 * 1024 });
  const gitDiff = execSync("git diff --stat", { cwd: workspaceRoot, maxBuffer: 10 * 1024 * 1024 });
  
  return buildAdaptiveEnvelope({
    git_status: gitStatus.toString().slice(0, 1500),
    git_diff_stat: gitDiff.toString().slice(0, 1500)
  });
}`
  },
  4: {
    tag: 'GATE: acceptance-gate.js',
    status: '[ACTIVE: 3-STAGE PIPELINE]',
    name: 'Stage 4: Jev Acceptance Gate',
    desc: 'Dual-stage verification pipeline with Stage 1.5 Ground-Truth Claim Reconciliation: Stage 1 executes test runners via safeSpawnAsync, Stage 1.5 audits agent claims against test execution and filesystem existence across extension variants (.ts/.tsx/.jsx/.mjs/.cjs/.js), and Stage 2 queries Jev System One.',
    features: [
      { key: 'Stage 1 Execution', val: 'safeSpawnAsync with ComSpec on Windows (45s timeout, 10MB buffer)' },
      { key: 'Stage 1.5 Lie Detector', val: 'Audits test claims, file existence variants, and build success' },
      { key: 'Stage 2 Semantic Gate', val: 'Jev System One Bayesian evaluation (/v1/systemone, P >= 0.85)' }
    ],
    previewTitle: 'harness/acceptance-gate.js [verifyAcceptanceGate]',
    code: `// 3-Stage verification pipeline before agent exit release
export async function verifyAcceptanceGate(customCmd, targetDir, agentStatement, sessionId) {
  // Stage 1: Runner execution
  const res = await safeSpawnAsync(testCommand, { timeout: 45000, maxBuffer: 10 * 1024 * 1024 });
  const parsedRun = parseTestRunnerOutput(ecosystem, res.stdout, res.stderr, res.code);

  // Stage 1.5: Ground-truth claim reconciliation
  const reconciliation = reconcileClaimsWithGroundTruth(claims, session, targetDir, parsedRun);
  if (!reconciliation.reconciled) return { passed: false, stage: 'stage_1_5', reason: reconciliation.reason };

  // Stage 2: Jev System One semantic gate
  return await callJevSystemOne({ state: telemetry, questions: { gate_approval: { type: 'noul' } } });
}`
  }
};

function initArchitectureStepper() {
  const stepper = document.getElementById('arch-stepper');
  if (!stepper) return;

  const buttons = stepper.querySelectorAll('.stage-step');
  const tagEl = document.getElementById('stage-tag');
  const statusEl = document.getElementById('stage-status');
  const nameEl = document.getElementById('stage-name');
  const descEl = document.getElementById('stage-description');
  const featuresEl = document.getElementById('stage-features');
  const previewTitleEl = document.getElementById('preview-title');
  const previewCodeEl = document.getElementById('preview-code');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const stageNum = btn.getAttribute('data-stage');
      const data = STAGES[stageNum];
      if (!data) return;

      tagEl.textContent = data.tag;
      statusEl.textContent = data.status;
      nameEl.textContent = data.name;
      descEl.textContent = data.desc;
      previewTitleEl.textContent = data.previewTitle;
      previewCodeEl.querySelector('code').textContent = data.code;

      featuresEl.innerHTML = '';
      data.features.forEach(feat => {
        const item = document.createElement('div');
        item.className = 'feature-item';
        item.innerHTML = `
          <span class="feature-key">${feat.key}</span>
          <span class="feature-val">${feat.val}</span>
        `;
        featuresEl.appendChild(item);
      });
    });
  });
}

/* -------------------------------------------------------------------------
 * 3-WAY BENCHMARK ARENA
 * ------------------------------------------------------------------------- */
const BENCHMARK_DATA = {
  without: {
    tag: 'IMPLEMENTATION A - RAW AUTONOMOUS AGENT',
    title: 'Without Harness (Unconstrained Raw Execution)',
    summary: 'Execution without interceptor hooks or test enforcement. Hallucinated a fictitious senior executive job title, introduced 8 decorative emojis into code and UI, generated 0 automated tests, and suffered from unverified claims despite burning 2.32M wire tokens.',
    tokens: '2,320,000',
    tokensNote: 'Base wire burn (No interceptor or token bounds)',
    turns: '22',
    turnsNote: 'Raw supervisor chat turns',
    score: '0.97 / 3.00',
    scoreNote: 'Flawed / Risky: Fictitious claims and 8 emojis',
    scoreClass: 'accent-crimson',
    tests: '0 / 0 Tests',
    testsNote: 'Zero automated verification',
    authenticity: 'SAMAR, Staff Infrastructure & Logistics Systems Engineer (Fictitious upgrade)',
    emojis: '8 Emojis detected (Prestige broken by AI slop)',
    winner: 'Adjudication: Flawed & Rejected (Bayesian probability: 0.00)'
  },
  v1: {
    tag: 'IMPLEMENTATION B - AEGIS V1 (UNCONSTRAINED POLLING)',
    title: 'Aegis V1 (High Prestige Quality, But Quadratic Polling)',
    summary: 'High output quality and 5 passing unit tests with 0 emojis, but the supervisor agent entered continuous status polling loops. Resending full conversation history across 73 turns generated a catastrophic 6.60M wire token explosion.',
    tokens: '6,600,000',
    tokensNote: 'Explosive quadratic compounding (73 turns)',
    turns: '73',
    turnsNote: 'Unconstrained supervisor polling loops',
    score: '2.86 / 3.00',
    scoreNote: 'Exceptional Staff caliber, but catastrophic token burn',
    scoreClass: 'accent-blue',
    tests: '5 / 5 Passed',
    testsNote: 'Solid baseline unit test coverage',
    authenticity: 'Samarjit Singh, Operations Manager | Logistics & Hub Scaling (Accurate)',
    emojis: '0 Emojis (Core Laws enforced)',
    winner: 'Adjudication: Runner-up due to extreme token inefficiency (Prob: 0.00)'
  },
  v2: {
    tag: 'IMPLEMENTATION C - AGENTAEGIS V2',
    title: 'Sandboxed Research + Anti-Compounding Supervisor Throttle',
    summary: 'Subagent task delegations run in bounded isolated contexts. Supervisor monitors state via deterministic test runners and diff snapshots. Zero thrashing loops, zero token compounding, 11 passing test gates, and 100% accurate system specs.',
    tokens: '220,000',
    tokensNote: '96.6% less than V1 | 90.5% less than Baseline',
    turns: '4',
    turnsNote: 'Bounded linear turns (anti-compounding throttle)',
    score: '2.88 / 3.00',
    scoreNote: 'Exceptional Staff/Executive engineering caliber',
    scoreClass: 'accent-blue',
    tests: '11 / 11 Passed',
    testsNote: 'Verified runner parser execution',
    authenticity: 'Samarjit Singh, Logistics Systems Architect & Operations Engineering Lead (Accurate)',
    emojis: '0 Emojis | 0 Hallucinations | Clean Technical Metrics',
    winner: 'Definitive Overall Winner (Probability = 1.00)'
  }
};

function initBenchmarkArena() {
  const tabs = document.querySelectorAll('.bench-tab');
  const tagEl = document.getElementById('bench-version-tag');
  const titleEl = document.getElementById('bench-title');
  const summaryEl = document.getElementById('bench-summary');
  const tokensEl = document.getElementById('bench-tokens');
  const tokenNoteEl = document.getElementById('bench-token-note');
  const turnsEl = document.getElementById('bench-turns');
  const turnsNoteEl = document.getElementById('bench-turns-note');
  const scoreEl = document.getElementById('bench-score');
  const scoreNoteEl = document.getElementById('bench-score-note');
  const testsEl = document.getElementById('bench-tests');
  const testsNoteEl = document.getElementById('bench-tests-note');
  const authEl = document.getElementById('bench-authenticity');
  const emojisEl = document.getElementById('bench-emojis');
  const winnerEl = document.getElementById('bench-winner');

  if (!tabs.length || !tokensEl) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const benchKey = tab.getAttribute('data-bench');
      const data = BENCHMARK_DATA[benchKey];
      if (!data) return;

      tagEl.textContent = data.tag;
      titleEl.textContent = data.title;
      summaryEl.textContent = data.summary;
      tokensEl.textContent = data.tokens;
      tokenNoteEl.textContent = data.tokensNote;
      turnsEl.textContent = data.turns;
      turnsNoteEl.textContent = data.turnsNote;
      scoreEl.textContent = data.score;
      scoreNoteEl.textContent = data.scoreNote;
      testsEl.textContent = data.tests;
      testsNoteEl.textContent = data.testsNote;
      authEl.textContent = data.authenticity;
      emojisEl.textContent = data.emojis;
      winnerEl.textContent = data.winner;

      scoreEl.className = 'stat-box-value ' + (data.scoreClass || 'accent-blue');
      tokensEl.className = 'stat-box-value ' + (benchKey === 'v2' ? 'accent-emerald' : (benchKey === 'v1' ? 'accent-crimson' : ''));
    });
  });
}

/* -------------------------------------------------------------------------
 * TOKEN PHYSICS SIMULATOR (QUADRATIC COMPOUNDING)
 * ------------------------------------------------------------------------- */
function initTokenPhysicsCalculator() {
  const slider = document.getElementById('turn-slider');
  const turnDisplay = document.getElementById('slider-turn-display');
  const unconstrainedTokensEl = document.getElementById('calc-unconstrained-tokens');
  const unconstrainedCostEl = document.getElementById('calc-unconstrained-cost');
  const aegisTokensEl = document.getElementById('calc-aegis-tokens');
  const aegisCostEl = document.getElementById('calc-aegis-cost');
  const savingsPercentEl = document.getElementById('calc-savings-percent');
  const tokensSavedEl = document.getElementById('calc-tokens-saved');
  const dollarsSavedEl = document.getElementById('calc-dollars-saved');
  const barUnconstrained = document.getElementById('bar-unconstrained');
  const barAegis = document.getElementById('bar-aegis');

  if (!slider) return;

  function recalculate() {
    const N = parseInt(slider.value, 10);
    turnDisplay.textContent = `${N} Turns`;

    // Unconstrained quadratic model:
    // Every turn resends prior conversation history.
    // Base prompt + tools = 25,000 tokens
    // History growth per turn = 1,800 tokens
    // Tokens(N) = N * 25,000 + (N * (N - 1) / 2) * 1,800
    const unconstrained = Math.round(N * 25000 + ((N * (N - 1)) / 2) * 1800);

    // AgentAegis V2 Bounded linear model:
    // Supervisor turns capped to atomic checks (max 4-6 turns)
    // Subagent tasks isolated with bounded context windows (15,000 - 25,000 tokens)
    const boundedSupervisorTurns = Math.min(4, Math.max(2, Math.ceil(N / 15)));
    const subagentRuns = Math.ceil(N / 10);
    const aegis = Math.round((boundedSupervisorTurns * 35000) + (subagentRuns * 18500));

    const saved = Math.max(0, unconstrained - aegis);
    const savingsPercent = ((saved / unconstrained) * 100).toFixed(1);

    // Pricing estimation at $3.00 per 1M tokens
    const pricePerMillion = 3.00;
    const unconstrainedCost = ((unconstrained / 1000000) * pricePerMillion).toFixed(2);
    const aegisCost = ((aegis / 1000000) * pricePerMillion).toFixed(2);
    const dollarsSaved = Math.max(0, parseFloat(unconstrainedCost) - parseFloat(aegisCost)).toFixed(2);

    unconstrainedTokensEl.textContent = unconstrained.toLocaleString('en-US');
    unconstrainedCostEl.textContent = `Estimated API Cost: $${unconstrainedCost} USD`;
    aegisTokensEl.textContent = aegis.toLocaleString('en-US');
    aegisCostEl.textContent = `Estimated API Cost: $${aegisCost} USD`;

    savingsPercentEl.textContent = `${savingsPercent}%`;
    tokensSavedEl.textContent = saved.toLocaleString('en-US');
    dollarsSavedEl.textContent = `$${dollarsSaved} Saved`;

    // Visual relative bar widths (capped at 100%)
    const maxTokensForBar = Math.max(unconstrained, 7000000);
    const unconstrainedPct = Math.min(100, Math.max(10, (unconstrained / maxTokensForBar) * 100));
    const aegisPct = Math.min(100, Math.max(4, (aegis / maxTokensForBar) * 100));

    barUnconstrained.style.width = `${unconstrainedPct}%`;
    barAegis.style.width = `${aegisPct}%`;
  }

  slider.addEventListener('input', recalculate);
  recalculate();
}

/* -------------------------------------------------------------------------
 * TERMINAL COMMAND SANDBOX SIMULATION
 * ------------------------------------------------------------------------- */
const COMMAND_RESPONSES = {
  'aegis install': [
    { text: '[AEGIS INSTALL]: Scanning workspace root for agent environment...', cls: 'term-emerald', delay: 100 },
    { text: '[SCAN COMPLETE]: Found Claude Code (.claude) and Cursor (.cursor)', cls: 'term-emerald', delay: 250 },
    { text: '[HOOK INJECTED]: .claude/settings.json -> preToolUse, postToolUse configured', cls: 'term-emerald', delay: 400 },
    { text: '[HOOK INJECTED]: .cursor/hooks.json -> preToolUse, postToolUse configured', cls: 'term-emerald', delay: 550 },
    { text: '[INITIALIZED]: State collector and 4 Core Laws linter armed.', cls: 'term-cyan', delay: 700 },
    { text: '[STATUS]: Exit Code 0. Workspace is fully protected by AgentAegis.', cls: 'term-emerald', delay: 850 }
  ],
  'aegis --all': [
    { text: '[AEGIS INSTALL]: Multi-engine provisioning triggered (--all)...', cls: 'term-emerald', delay: 100 },
    { text: '[TARGET: CLAUDE]: Registered preToolUse & postToolUse in .claude/settings.json', cls: 'term-emerald', delay: 250 },
    { text: '[TARGET: CURSOR]: Registered preToolUse & postToolUse in .cursor/hooks.json', cls: 'term-emerald', delay: 400 },
    { text: '[TARGET: ANTIGRAVITY]: Registered hooks in .antigravity/hooks.json', cls: 'term-emerald', delay: 550 },
    { text: '[SECURITY]: Fail-closed fastpath active. Overhead: < 1.2ms per tool invocation.', cls: 'term-cyan', delay: 700 },
    { text: '[STATUS]: Universal cognitive interceptor armed. Exit Code 0.', cls: 'term-emerald', delay: 850 }
  ],
  'aegis check-cycle': [
    { text: '[AEGIS CHECK-CYCLE]: Inspecting active session state...', cls: 'term-blue', delay: 100 },
    { text: '[SESSION RESOLUTION]: Chain: AEGIS_SESSION_ID -> stdinPayload.session_id -> CONVERSATION_ID -> CLAUDE_CONVERSATION_ID -> CURSOR_SESSION_ID -> .aegis-session -> cwdHash', cls: 'term-blue', delay: 250 },
    { text: '[ACTIVE SESSION]: ID = "sess_a8f92b" | Rolling History Entries: 2', cls: 'term-emerald', delay: 400 },
    { text: '[CYCLE STATUS]: NOMINAL (No thrashing detected, variance = 0.42)', cls: 'term-emerald', delay: 550 },
    { text: '[STATUS]: Circuit breaker nominal. Exit Code 0.', cls: 'term-cyan', delay: 700 }
  ],
  'aegis verify': [
    { text: '[AEGIS VERIFY]: Executing 3-Stage Acceptance Gate on target workspace...', cls: 'term-blue', delay: 100 },
    { text: '[STAGE 1]: Multi-ecosystem runner detected (Node.js/npm). Running test suites...', cls: 'term-blue', delay: 300 },
    { text: '[STAGE 1 PASS]: safeSpawnAsync executed 11/11 tests green with zero failures.', cls: 'term-emerald', delay: 500 },
    { text: '[STAGE 1.5]: Claim-to-Reality reconciliation verified against disk & session telemetry.', cls: 'term-emerald', delay: 700 },
    { text: '[STAGE 2]: Jev System One semantic gate approved (P = 0.99).', cls: 'term-cyan', delay: 900 },
    { text: '[AEGIS VERIFY PASS]: Acceptance gate cleared successfully. Exit code 0.', cls: 'term-emerald', delay: 1050 }
  ],
  'aegis gate': [
    { text: '[AEGIS GATE]: Executing 3-Stage Acceptance Gate on target workspace...', cls: 'term-blue', delay: 100 },
    { text: '[STAGE 1]: Multi-ecosystem runner detected. Executing test suites via safeSpawnAsync...', cls: 'term-blue', delay: 300 },
    { text: '[STAGE 1 PASS]: 11/11 automated tests passed in 2.14s.', cls: 'term-emerald', delay: 500 },
    { text: '[STAGE 1.5]: Claim-to-Reality ground truth reconciled (0 discrepancies).', cls: 'term-emerald', delay: 700 },
    { text: '[STAGE 2]: Jev System One semantic gate approved (P = 0.99).', cls: 'term-cyan', delay: 900 },
    { text: '[AEGIS GATE PASS]: Gate unlocked. Task released with exit code 0.', cls: 'term-emerald', delay: 1050 }
  ],
  'aegis test:veto': [
    { text: '[AEGIS TEST:VETO]: Simulating destructive command invocation: rm -rf / --no-preserve-root', cls: 'term-blue', delay: 100 },
    { text: '[SENSITIVE-GUARD]: Fastpath regex evaluation executing...', cls: 'term-blue', delay: 250 },
    { text: '[JEV SAFETY VETO]: Destructive command pattern blocked by fastpath filter.', cls: 'term-crimson', delay: 450 },
    { text: '[VETO ENFORCED]: Process terminated with Exit Code 2. Disk untouched.', cls: 'term-crimson', delay: 650 }
  ],
  'test:veto': [
    { text: '[INTERCEPTOR HOOK]: Tool invocation detected: run_command', cls: 'term-blue', delay: 100 },
    { text: '[INSPECT PAYLOAD]: CommandLine = "rm -rf / --no-preserve-root"', cls: 'term-amber', delay: 250 },
    { text: '[SENSITIVE-GUARD]: Fastpath regex evaluation executing...', cls: 'term-blue', delay: 400 },
    { text: '[JEV SAFETY VETO]: Raw input blocked by safety filter: Destructive pattern detected in payload.', cls: 'term-crimson', delay: 600 },
    { text: '[INTERCEPTOR RESULT]: Process execution terminated immediately.', cls: 'term-crimson', delay: 750 },
    { text: '[EXIT STATUS]: Process exited with code 2 (VETO_DESTRUCTIVE). Disk untouched.', cls: 'term-crimson', delay: 900 }
  ],
  'test:cycle': [
    { text: '[INTERCEPTOR HOOK]: Tool invocation: replace_file_content (Attempt 1) [PASS]', cls: 'term-blue', delay: 100 },
    { text: '[INTERCEPTOR HOOK]: Tool invocation: replace_file_content (Attempt 2) [PASS]', cls: 'term-blue', delay: 300 },
    { text: '[INTERCEPTOR HOOK]: Tool invocation: replace_file_content (Attempt 3) [EVALUATING]', cls: 'term-blue', delay: 500 },
    { text: '[CYCLE DETECTOR]: Virtual shadow buffer match. Diff variance = 0.00.', cls: 'term-amber', delay: 650 },
    { text: '[THRASHER DETECTED]: Repetitive tool execution sequence detected (Turn 3 >= Threshold 3).', cls: 'term-crimson', delay: 800 },
    { text: '[CIRCUIT BREAKER TRIPPED]: Halting execution loop to prevent quadratic token burn.', cls: 'term-crimson', delay: 950 },
    { text: '[STATUS]: Loop terminated. Session state persisted to .aegis-harness/. Exit code 2.', cls: 'term-amber', delay: 1100 }
  ],
  'test:gate': [
    { text: '[GATE TRIGGERED]: verify-gate invoked prior to task completion release...', cls: 'term-blue', delay: 100 },
    { text: '[STAGE 1 RUNNER PARSER]: Running configured test suites via Node.js runner...', cls: 'term-blue', delay: 300 },
    { text: '[STAGE 1 RUNNER]: 11/11 automated tests passed (0 failures, 0 skipped) in 2.14s.', cls: 'term-emerald', delay: 500 },
    { text: '[STAGE 1.5 RECONCILIATION]: Auditing agent claims vs disk existence (.js/.ts/.tsx/etc.) and test status...', cls: 'term-blue', delay: 650 },
    { text: '[STAGE 1.5 PASS]: All verifiable claims reconciled against disk & session telemetry.', cls: 'term-emerald', delay: 800 },
    { text: '[STAGE 2 JEV SYSTEM 1]: Bayesian rubric score = 2.88 / 3.00 (Staff/Executive caliber).', cls: 'term-cyan', delay: 950 },
    { text: '[ACCEPTANCE GATE VERIFIED]: Gate unlocked. Task approved for release. Exit code 0.', cls: 'term-emerald', delay: 1100 }
  ],
  'help': [
    { text: 'Available simulated commands matching bin/cli.js:', cls: 'term-cyan', delay: 50 },
    { text: '  aegis install      - Automatic hook registration for detected engines', cls: 'term-blue', delay: 100 },
    { text: '  aegis --all        - Provisions Claude, Cursor, and Antigravity', cls: 'term-blue', delay: 150 },
    { text: '  aegis verify       - Runs 3-Stage Acceptance Gate (safeSpawnAsync, Stage 1.5, Jev)', cls: 'term-blue', delay: 200 },
    { text: '  aegis check-cycle  - Inspects active session history and loop circuit breaker', cls: 'term-blue', delay: 250 },
    { text: '  aegis test:veto    - Simulates destructive command veto (Exit Code 2)', cls: 'term-blue', delay: 300 },
    { text: '  test:cycle         - Simulates 3-turn thrashing loop breaker', cls: 'term-blue', delay: 350 },
    { text: '  clear              - Clears terminal scrollback', cls: 'term-blue', delay: 400 }
  ]
};

function initTerminalSandbox() {
  const terminalBody = document.getElementById('terminal-body');
  const inputField = document.getElementById('terminal-input');
  const submitBtn = document.getElementById('terminal-submit-btn');
  const clearBtn = document.getElementById('term-clear-btn');
  const presetButtons = document.querySelectorAll('.term-btn[data-cmd]');

  if (!terminalBody || !inputField) return;

  function getTimeString() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
  }

  function appendTerminalLine(content, className = '') {
    const line = document.createElement('div');
    line.className = 'terminal-line ' + className;
    line.innerHTML = content;
    terminalBody.appendChild(line);
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  function executeCommand(rawCmd) {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    // Echo command prompt
    appendTerminalLine(`<span class="line-time">${getTimeString()}</span> <span class="line-prompt">$</span> <span class="term-cmd">${escapeHtml(cmd)}</span>`);

    if (cmd === 'clear') {
      terminalBody.innerHTML = '';
      appendTerminalLine(`<span class="line-time">${getTimeString()}</span> <span class="term-blue">aegis</span> terminal cleared.`);
      return;
    }

    const script = COMMAND_RESPONSES[cmd.toLowerCase()];
    if (script) {
      script.forEach(step => {
        setTimeout(() => {
          appendTerminalLine(
            `<span class="line-time">${getTimeString()}</span> ${escapeHtml(step.text)}`,
            step.cls
          );
        }, step.delay);
      });
    } else {
      setTimeout(() => {
        appendTerminalLine(
          `<span class="line-time">${getTimeString()}</span> Unknown command: "${escapeHtml(cmd)}". Type 'help' to see available sandbox commands.`,
          'term-amber'
        );
      }, 100);
    }
  }

  submitBtn?.addEventListener('click', () => {
    executeCommand(inputField.value);
    inputField.value = '';
  });

  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeCommand(inputField.value);
      inputField.value = '';
    }
  });

  clearBtn?.addEventListener('click', () => {
    terminalBody.innerHTML = '';
    appendTerminalLine(`<span class="line-time">${getTimeString()}</span> <span class="term-blue">aegis</span> terminal buffer cleared.`);
  });

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cmd = btn.getAttribute('data-cmd');
      if (cmd) executeCommand(cmd);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* -------------------------------------------------------------------------
 * MULTI-ENGINE QUICKSTART TABS
 * ------------------------------------------------------------------------- */
function initEngineTabs() {
  const tabs = document.querySelectorAll('.engine-tab');
  const panels = document.querySelectorAll('.engine-panel');

  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetEngine = tab.getAttribute('data-engine');
      const targetPanel = document.getElementById(`panel-${targetEngine}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

/* -------------------------------------------------------------------------
 * COPY TO CLIPBOARD BUTTONS
 * ------------------------------------------------------------------------- */
function initCopyButtons() {
  const buttons = document.querySelectorAll('.btn-copy');

  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const copyText = btn.getAttribute('data-copy');
      if (!copyText) return;

      try {
        await navigator.clipboard.writeText(copyText);
        const originalText = btn.textContent;
        btn.textContent = 'COPIED';
        btn.classList.add('copied');

        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        // Fallback for non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = copyText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          const originalText = btn.textContent;
          btn.textContent = 'COPIED';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
          }, 2000);
        } catch {}
        document.body.removeChild(textarea);
      }
    });
  });
}
