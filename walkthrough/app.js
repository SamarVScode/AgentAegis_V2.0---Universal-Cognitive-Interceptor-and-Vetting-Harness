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
    desc: 'Intercepts every tool call before disk mutation or shell execution occurs. Evaluates arguments against destructive action filters, directory traversal rules, and secret token guards. Instantly issues Exit Code 2 with a safety veto on destructive shell operations like raw deletion or storage resets.',
    features: [
      { key: 'Execution Speed', val: 'Under 1.2ms (Zero network overhead)' },
      { key: 'Core Laws Linter', val: 'Zero-token AST scan for banned slop patterns' },
      { key: 'Destructive Veto', val: 'Instant SIGTERM / Exit Code 2 on destructive commands' }
    ],
    previewTitle: 'harness/interceptor.js [preToolUse]',
    code: `// Intercept incoming tool invocation
const isDestructive = isDestructiveAction(toolName, toolArgs);
if (isDestructive) {
  process.stderr.write("[JEV SAFETY VETO]: Destructive command pattern blocked.\\n");
  process.exit(2);
}

// Zero-token 4 Core Laws validation
const violations = lintCoreLaws(toolArgs.CodeContent || "");
if (violations.length > 0) {
  process.stderr.write(\`[CORE LAWS VETO]: \${violations.join(", ")}\\n\`);
  process.exit(1);
}`
  },
  2: {
    tag: 'MODULE: cycle-detector.js',
    status: '[ACTIVE: THRESHOLD=3]',
    name: 'Stage 2: Cycle Detector & Diff Variance Breaker',
    desc: 'Maintains a rolling SHA-256 fingerprint window of tool actions and target arguments. Reconstructs a virtual shadow buffer for partial edits to observe macro-file convergence. If an agent loops on the same error or thrashing pattern 3 times, the circuit trips immediately to stop token burn.',
    features: [
      { key: 'Thrashing Threshold', val: 'Hard trip at 3 repeated cycles (vs 5 in unhardened)' },
      { key: 'Shadow Buffer', val: 'In-memory virtual assembly of partial edits' },
      { key: 'Diff Variance Metric', val: 'Levenshtein divergence ratio across sequential turns' }
    ],
    previewTitle: 'harness/cycle-detector.js [circuitBreaker]',
    code: `// Evaluate rolling tool sequence hash
const actionHash = hashToolInvocation(toolName, toolArgs);
const repetitionCount = countSequentialRepetitions(sessionHistory, actionHash);

if (repetitionCount >= 3) {
  process.stderr.write("[THRASHER DETECTED]: Repetitive sequence detected.\\n");
  process.stderr.write("[CIRCUIT BREAKER]: Halting execution loop to prevent quadratic burn.\\n");
  saveSessionState(sessionId, { status: "TRIPPED_CYCLE_BREAKER" });
  process.exit(1);
}`
  },
  3: {
    tag: 'MODULE: state-collector.js',
    status: '[ACTIVE: ADAPTIVE ENVELOPE]',
    name: 'Stage 3: Ground Truth State Collector',
    desc: 'Extracts real git worktree status, unit test exit codes, and sanitized source changes into a compact envelope. Strips verbose binary data and non-essential logs, transmitting only verifiable diffs to the supervisor. Completely eliminates hallucinated claims.',
    features: [
      { key: 'Ground Truth Source', val: 'Direct process inspect + git status + AST metrics' },
      { key: 'Payload Optimization', val: 'Selective diff truncation preserving token bounds' },
      { key: 'Hallucination Defense', val: 'Subagent claims checked against filesystem reality' }
    ],
    previewTitle: 'harness/state-collector.js [collectState]',
    code: `// Collect ground truth state without token compounding
export async function collectState(workspaceRoot) {
  const gitDiff = await execAsync("git diff --stat", { cwd: workspaceRoot });
  const testResults = parseTestRunners(workspaceRoot);
  const coreLints = scanForBannedTokens(workspaceRoot);

  return {
    verified_passes: testResults.passed,
    failing_tests: testResults.failed,
    files_modified: gitDiff.summary,
    slop_violations: coreLints.violations
  };
}`
  },
  4: {
    tag: 'GATE: acceptance-gate.js',
    status: '[ACTIVE: FAIL-CLOSED]',
    name: 'Stage 4: Jev Acceptance Gate',
    desc: 'The final deterministic hurdle. Before any agent can declare a mission complete, the acceptance gate executes configured test runners and verifies full adherence to prestige rubrics. If even one test fails or an emoji is detected, completion is refused with exit code 1.',
    features: [
      { key: 'Runner Execution', val: 'Automated runner parser for Node, Jest, Cargo, Vitest' },
      { key: 'Jev Adjudication', val: 'System 1 Bayesian rubric evaluation (P >= 0.95)' },
      { key: 'Fail-Closed Security', val: 'No ambiguous passes; missing credentials trigger abort' }
    ],
    previewTitle: 'harness/acceptance-gate.js [verifyGate]',
    code: `// Enforce final gate verification before exit
export async function verifyAcceptanceGate(opts = {}) {
  const suiteResult = await executeAutomatedSuites();
  if (!suiteResult.success) {
    throw new Error(\`Acceptance gate blocked: \${suiteResult.failures} tests failing.\`);
  }

  const adjudication = await callJevSystemOne({
    state: suiteResult.summary,
    questions: { pass_rubric: { type: "boolean" } }
  });

  if (!adjudication.answers.pass_rubric.value) {
    throw new Error("Acceptance gate blocked by Jev System 1 rubric check.");
  }
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
    { text: '[STATUS]: Loop terminated. Session state persisted to .jev/sessions/. Exit code 1.', cls: 'term-amber', delay: 1100 }
  ],
  'test:gate': [
    { text: '[GATE TRIGGERED]: verify-gate invoked prior to task completion release...', cls: 'term-blue', delay: 100 },
    { text: '[RUNNER PARSER]: Running configured test suites via Node.js runner...', cls: 'term-blue', delay: 300 },
    { text: '[TEST RUNNER]: 11/11 automated tests passed (0 failures, 0 skipped) in 2.14s.', cls: 'term-emerald', delay: 500 },
    { text: '[CORE LAWS LINTER]: Scanning workspace AST for decorative emojis & AI slop...', cls: 'term-blue', delay: 650 },
    { text: '[CORE LAWS]: 0 emojis detected. 0 banned markdown patterns found.', cls: 'term-emerald', delay: 800 },
    { text: '[JEV SYSTEM 1]: Bayesian rubric score = 2.88 / 3.00 (Staff/Executive caliber).', cls: 'term-cyan', delay: 950 },
    { text: '[ACCEPTANCE GATE VERIFIED]: Gate unlocked. Task approved for release. Exit code 0.', cls: 'term-emerald', delay: 1100 }
  ],
  'help': [
    { text: 'Available simulated commands:', cls: 'term-cyan', delay: 50 },
    { text: '  aegis install    - Simulates automatic hook registration', cls: 'term-blue', delay: 100 },
    { text: '  aegis --all      - Provisions Claude, Cursor, and Antigravity', cls: 'term-blue', delay: 150 },
    { text: '  test:veto        - Simulates destructive command intercept (Exit code 2)', cls: 'term-blue', delay: 200 },
    { text: '  test:cycle       - Simulates 3-turn thrashing loop breaker', cls: 'term-blue', delay: 250 },
    { text: '  test:gate        - Simulates acceptance gate test verification', cls: 'term-blue', delay: 300 },
    { text: '  clear            - Clears terminal scrollback', cls: 'term-blue', delay: 350 }
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
