import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

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

console.log('Loading full 14-file codebase context into memory...');
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
console.log(`Loaded 14 files into context (${totalChars} chars).`);

// All questions defined strictly as NOUL evaluation items (continuous 0.00 to 1.00 probability)
const noulQuestions = {
  // =========================================================================
  // GROUP 1: REAL-WORLD BREAKAGE & EDGE-CASE FAILURE MODES
  // =========================================================================
  break_monorepo_diff_overflow: {
    type: 'noul',
    instructions: 'When a user prompts a massive 50-file refactor that generates >10MB git diff output, does state-collector.js safely truncate with maxBuffer (10MB) and prevent process crashes?',
    criteria: {
      true: 'state-collector.js safely buffers, catches maxBuffer overflow, and truncates without throwing unhandled exceptions.',
      false: 'Large monorepo diffs cause unhandled ERR_CHILD_PROCESS_STDIO_MAXBUFFER crashes.'
    }
  },
  break_windows_posix_path_handling: {
    type: 'noul',
    instructions: 'When tools or IDEs pass mixed Windows backslashes (C:\\project\\file) and POSIX slashes (C:/project/file), does the harness normalize paths consistently for sensitive screening and existence checks?',
    criteria: {
      true: 'Path normalization and path.resolve handle mixed slash separators reliably across Windows and POSIX environments.',
      false: 'Mismatched path separators cause false negatives in sensitive screening or file claim verification.'
    }
  },
  break_compound_custom_runner_commands: {
    type: 'noul',
    instructions: 'When a user supplies a compound verification command containing && (e.g. npm run build && npm test), does the acceptance gate reject it due to shell injection rules, creating friction for compound scripts?',
    criteria: {
      true: 'Yes, the shell control check (/[;&|`$><]/) deliberately rejects compound chained commands to prevent injection, requiring a single runner or custom script.',
      false: 'Compound chained commands execute without restriction in custom runner mode.'
    }
  },
  break_iterative_debugging_false_cycles: {
    type: 'noul',
    instructions: 'When an agent makes rapid successive edits to different lines of the same file during legitimate debugging, does edit variance calculation prevent false-positive cycle breaks?',
    criteria: {
      true: 'Edit variance across different line offsets produces non-zero variance (>0.00), preventing false cycle triggers on progressive fixes.',
      false: 'Any 3 successive edits to the same file trigger a false cycle breaker regardless of line location.'
    }
  },
  break_uninitialized_git_repository: {
    type: 'noul',
    instructions: 'When prompted in a brand new directory where git is not initialized (fatal: not a git repository), does state-collector.js handle the git failure gracefully without crashing?',
    criteria: {
      true: 'state-collector.js catches git exit errors and falls back gracefully to empty git status and diff.',
      false: 'Uninitialized git repositories throw unhandled errors that crash the interceptor.'
    }
  },
  break_noisy_verbose_test_stdout: {
    type: 'noul',
    instructions: 'When a failing test suite prints verbose debug logs (megabytes of stdout), does runner-parser.js and safeSpawnAsync safely tail output and extract the test summary without buffer exhaustion?',
    criteria: {
      true: 'Output tailing (stdout.slice(-1000), maxBuffer 10MB) safely extracts runner summaries from noisy output.',
      false: 'Verbose test outputs exhaust memory or crash the regex semantic parsers.'
    }
  },
  break_offline_or_missing_api_key: {
    type: 'noul',
    instructions: 'When running offline or with an invalid TYPESAFE_API_KEY, does handleBipartiteFailSafe allow normal edits to proceed (fail-open) while halting destructive actions (fail-closed)?',
    criteria: {
      true: 'Bipartite fail-safe preserves normal developer workflow for benign tools while blocking destructive commands on network failure.',
      false: 'Missing API keys lock up the developer or allow unvetted destructive commands.'
    }
  },
  break_package_installation_veto: {
    type: 'noul',
    instructions: 'When an agent runs npm install or pip install to add dependencies, does the harness correctly distinguish package management from destructive commands and allow it without false Jev vetoes?',
    criteria: {
      true: 'Package installation commands are recognized as non-destructive and execute without interruption.',
      false: 'npm install is misclassified as destructive and blocked.'
    }
  },
  break_config_file_modification: {
    type: 'noul',
    instructions: 'When an agent edits package.json, tsconfig.json, or .gitignore, does sensitive-guard.js permit project configuration edits while strictly protecting credentials (.env, id_rsa)?',
    criteria: {
      true: 'Standard project config files are allowed while credential files (.env, *.pem, *.key) are protected.',
      false: 'package.json edits are falsely blocked as sensitive, or .env files are left unprotected.'
    }
  },
  break_manifest_free_directory_stop: {
    type: 'noul',
    instructions: 'When an agent works in a documentation or scratch directory with no build manifest, does verifyAcceptanceGate pass Stage 1 without ENOENT crashes while preserving Stage 1.5 claim reconciliation?',
    criteria: {
      true: 'Manifest-less directories short-circuit Stage 1 with passed: true while maintaining disk claim auditing.',
      false: 'Manifest-less directories trigger ENOENT crashes and veto completion.'
    }
  },

  // =========================================================================
  // GROUP 2: TOKEN EFFICIENCY, CODE QUALITY & REAL-WORLD VALUE
  // =========================================================================
  token_efficiency_wire_savings: {
    type: 'noul',
    instructions: 'Does AgentAegis deliver a substantial (70-90%+) reduction in total wire tokens across multi-turn autonomous coding tasks by halting runaway thrashing loops early?',
    criteria: {
      true: 'Halting repeating edits at Turn 3 and verifying tests at completion prevents 30-70 turn token blowups, producing massive net savings.',
      false: 'The harness hook overhead outweighs token savings.'
    }
  },
  code_output_quality_enhancement: {
    type: 'noul',
    instructions: 'Does AgentAegis measurably enhance project code quality and eliminate confabulated test passes ("all tests passed" when tests failed or didn\'t run)?',
    criteria: {
      true: 'Deterministic test gates and claim reconciliation eliminate confabulations and ensure only working, verified code is declared complete.',
      false: 'The harness has no measurable effect on final code output quality.'
    }
  },
  developer_triage_velocity_boost: {
    type: 'noul',
    instructions: 'Does catching repeating errors at Turn 3 vs Turn 30 improve developer turnaround time (TAT) and prevent corrupted repository states?',
    criteria: {
      true: 'Early circuit breaking forces an immediate pivot, saving developer triage and rollback time.',
      false: 'Circuit breaking adds more friction than value.'
    }
  },
  is_harness_worth_deploying_overall: {
    type: 'noul',
    instructions: 'Is AgentAegis worth deploying in autonomous coding workflows (Claude Code, Cursor, Antigravity) to bound tokens, halt thrashing, and gate completions?',
    criteria: {
      true: 'Yes, AgentAegis provides significant value by halting runaway loops, screening sensitive paths, and enforcing deterministic test gates.',
      false: 'No, the harness introduces more friction or overhead than value.'
    }
  }
};

async function executeNoulAudit() {
  console.log('\n======================================================');
  console.log('STARTING JEV SYSTEM ONE NOUL-BASED EVALUATION');
  console.log('Sending full 14-file codebase context in state');
  console.log(`Evaluating ${Object.keys(noulQuestions).length} real-world breakage and impact items`);
  console.log('======================================================\n');

  try {
    const res = await callJevSystemOne({
      state: {
        assessment_type: 'comprehensive_noul_breakage_and_impact_audit',
        full_codebase: fullCodebase
      },
      questions: noulQuestions,
      timeoutMs: 120000
    });

    const answers = res.answers || res.questions || res;
    console.log('--- JEV SYSTEM ONE NOUL RESULTS ---');
    
    const resultsTable = [];
    for (const [key, val] of Object.entries(answers)) {
      const noulVal = typeof val.noul === 'number' ? val.noul : (val.score !== undefined ? val.score / 3.0 : 0.5);
      const probPct = (noulVal * 100).toFixed(1);
      console.log(`  - ${key}: ${probPct}% (noul: ${noulVal.toFixed(3)})`);
      resultsTable.push({
        key,
        noul: noulVal,
        percentage: `${probPct}%`,
        raw: val
      });
    }

    const report = {
      timestamp: new Date().toISOString(),
      adjudicator: 'jev-1.13.0',
      total_questions: Object.keys(noulQuestions).length,
      total_context_chars: totalChars,
      answers,
      resultsTable
    };

    const outPath = path.join(rootDir, 'test', 'jev-noul-break-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\nNoul audit complete! Saved to: ${outPath}`);
  } catch (err) {
    console.error('Fatal Noul Audit Error:', err.message);
    process.exit(1);
  }
}

executeNoulAudit();
