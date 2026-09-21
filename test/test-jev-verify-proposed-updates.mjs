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
  fullCodebase[f] = fs.readFileSync(path.join(rootDir, f), 'utf8');
}

const proposedInstallChanges = `
In harness/install.js:
Add Section 5 to CLAUDE.md template:
## 5. Token Efficiency & Context Protection
- Universal Research Sandboxing: When reading multi-file documentation (Obsidian vaults, markdown notes, PDF specs, Excel/CSV datasets, or multi-query web searches), never dump raw files or scraped search outputs directly into coordinator context. Delegate bulk research to an ephemeral subagent that distills findings into a compact <1,500 token summary artifact (RESEARCH.md) and terminates. The coordinator only reads the summary artifact once.
- Focal Chunking: When inspecting code files, use targeted line slices (StartLine/EndLine) or symbol grep rather than loading entire multi-thousand-line files.
- Supervisor Coordination: Do not poll subagent or task status in an active loop. Stop calling tools and rely on reactive wakeups.

Add Section 5 to GEMINI.md template:
### 5. Token Efficiency & Context Protection
- Universal Research Sandboxing: For multi-file documentation (Obsidian vaults, markdown directories, PDF specs, Excel/CSV datasets, or multi-query web searches), do not dump raw files or scraped HTML into coordinator context. Delegate bulk research to an ephemeral subagent that produces a compact <1,500 token summary artifact (RESEARCH.md).
- Focal Chunking: Read only necessary line slices (StartLine/EndLine) or symbol search rather than loading whole multi-thousand-line files.
- Supervisor Coordination: Never poll subagents or tasks in an active loop. Rely on reactive wakeups or schedule timers.
`;

const proposedCycleDetectorChanges = `
In harness/cycle-detector.js:
Add explicit supervisor polling circuit breaker:
const SUPERVISOR_POLL_TOOLS = new Set([
  'manage_subagents',
  'manage_task',
  'list_subagents',
  'task_status'
]);

If toolName is in SUPERVISOR_POLL_TOOLS:
- If repeatCount === 3: return warning (supervisor_polling_warning) reminding coordinator to stop polling and rely on reactive wakeups.
- If repeatCount >= 5: return hard veto (isThrashing: true, reason: 'supervisor_polling_veto') halting the unproductive loop.
`;

try {
  const response = await callJevSystemOne({
    state: {
      complete_harness_source_code: fullCodebase,
      proposed_install_changes: proposedInstallChanges,
      proposed_cycle_detector_changes: proposedCycleDetectorChanges
    },
    questions: {
      approve_install_rules: {
        type: 'choice',
        instructions: 'Do you approve adding Universal Research Sandboxing, Focal Chunking, and Supervisor Coordination rules to CLAUDE.md and GEMINI.md in harness/install.js?',
        criteria: {
          approve: 'Approve: The rules provide clear behavioral boundaries that prevent compounding context bloat across multi-modal inputs without breaking stack-agnostic universality.',
          reject: 'Reject: The rules degrade agent autonomy or are harmful.'
        }
      },
      approve_cycle_detector_throttle: {
        type: 'choice',
        instructions: 'Do you approve adding the supervisor polling circuit breaker (warning at 3, veto at 5) to harness/cycle-detector.js?',
        criteria: {
          approve: 'Approve: It cleanly halts supervisor polling loops that caused the 5.39M token explosion while preserving existing edit variance and oscillating loop protections.',
          reject: 'Reject: Do not add supervisor polling checks.'
        }
      },
      regression_risk: {
        type: 'choice',
        instructions: 'Does applying these two proposed changes introduce any risk of breaking existing tests or harming code quality?',
        criteria: {
          zero_risk: 'Zero to minimal risk: Fully backward-compatible with existing 11 test modules and live hooks.',
          high_risk: 'High risk of breaking existing functionality.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('JEV VERIFICATION OF PROPOSED UPDATES:');
  console.log(JSON.stringify(response, null, 2));
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
