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
let totalChars = 0;
for (const f of allFiles) {
  const content = fs.readFileSync(path.join(rootDir, f), 'utf8');
  fullCodebase[f] = content;
  totalChars += content.length;
}

console.log(`Loaded full 14-file codebase context: ${allFiles.length} files, ${totalChars} characters.`);

const results = {};

// Helper to delay between API calls
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Issue 1
console.log('\n[Adjudicating Issue 1: Fail-open on internal crashes]...');
const r1 = await callJevSystemOne({
  state: { codebase: fullCodebase },
  questions: {
    issue_1: {
      type: 'choice',
      instructions: 'Should interceptor.js enforce fail-closed (exit 2) when an uncaught error occurs during a potentially destructive operation?',
      criteria: {
        fail_closed_required: 'Yes: Enforce fail-closed (exit 2) if raw args or command indicate destructive intent.',
        fail_open_acceptable: 'No: Fail-open on all uncaught exceptions.'
      }
    }
  }
});
results.issue_1 = r1.answers.issue_1;
console.log('Issue 1 verdict:', r1.answers.issue_1);
await delay(1000);

// Issue 2
console.log('\n[Adjudicating Issue 2: core-laws-linter.js dead stub vs documentation]...');
const r2 = await callJevSystemOne({
  state: { codebase: fullCodebase },
  questions: {
    issue_2: {
      type: 'choice',
      instructions: 'How should harness/core-laws-linter.js and its documentation claims be resolved?',
      criteria: {
        implement_real_invariants_and_sync_docs: 'Implement real invariant checks (e.g. prohibited dangerous runtime APIs, unapproved native bindings) and reconcile documentation.',
        keep_noop_stub: 'Keep noop stub without changes.'
      }
    }
  }
});
results.issue_2 = r2.answers.issue_2;
console.log('Issue 2 verdict:', r2.answers.issue_2);
await delay(1000);

// Issue 3
console.log('\n[Adjudicating Issue 3: Shell injection in acceptance gate customCommand]...');
const r3 = await callJevSystemOne({
  state: { codebase: fullCodebase },
  questions: {
    issue_3: {
      type: 'choice',
      instructions: 'In harness/acceptance-gate.js, should customCommand reject shell chaining and metacharacters (&&, ||, ;, |, backticks, subshells, redirects)?',
      criteria: {
        sanitize_and_reject_metachars: 'Yes: Strictly reject shell metacharacters to prevent command injection.',
        allow_raw_shell_command: 'No: Allow arbitrary shell metacharacters.'
      }
    }
  }
});
results.issue_3 = r3.answers.issue_3;
console.log('Issue 3 verdict:', r3.answers.issue_3);
await delay(1000);

// Issue 4
console.log('\n[Adjudicating Issue 4: Sensitive path inspection in generic run_command arguments]...');
const r4 = await callJevSystemOne({
  state: { codebase: fullCodebase },
  questions: {
    issue_4: {
      type: 'choice',
      instructions: 'Should sensitive-path inspection also scan command arguments for generic shell execution tools (run_command, bash, pwsh) to prevent exfiltration bypasses?',
      criteria: {
        scan_command_args_for_sensitive_paths: 'Yes: Scan command arguments against SENSITIVE_PATH_PATTERNS to prevent exfiltration via shell tools.',
        only_scan_named_read_tools: 'No: Only inspect named read tools.'
      }
    }
  }
});
results.issue_4 = r4.answers.issue_4;
console.log('Issue 4 verdict:', r4.answers.issue_4);
await delay(1000);

// Issue 5
console.log('\n[Adjudicating Issue 5: Fixed 500ms stdin timeout in readStdinJson]...');
const r5 = await callJevSystemOne({
  state: { codebase: fullCodebase },
  questions: {
    issue_5: {
      type: 'choice',
      instructions: 'In interceptor.js readStdinJson, should an inactivity timeout / extended stream handling be used instead of a fixed 500ms cutoff?',
      criteria: {
        use_inactivity_and_extended_timeout: 'Yes: Use inactivity timeout and higher grace period to avoid dropping slow or large payloads.',
        keep_fixed_500ms_timeout: 'No: 500ms fixed cutoff is sufficient.'
      }
    }
  }
});
results.issue_5 = r5.answers.issue_5;
console.log('Issue 5 verdict:', r5.answers.issue_5);
await delay(1000);

// Issue 6
console.log('\n[Adjudicating Issue 6: Session collision on cwd-hash fallback for concurrent sessions]...');
const r6 = await callJevSystemOne({
  state: { codebase: fullCodebase },
  questions: {
    issue_6: {
      type: 'choice',
      instructions: 'In interceptor.js, should the fallback sessionId include process PPID/PID or run timestamp to isolate concurrent agent sessions in the same cwd?',
      criteria: {
        scope_fallback_with_process_id: 'Yes: Include parent PID or run context in fallback sessionId to prevent cross-session contamination.',
        keep_static_cwd_hash: 'No: cwd-hash alone is sufficient.'
      }
    }
  }
});
results.issue_6 = r6.answers.issue_6;
console.log('Issue 6 verdict:', r6.answers.issue_6);
await delay(1000);

// Issues 7 & 8
console.log('\n[Adjudicating Issues 7 & 8: Heuristic nature of regex detection & user-configurable deny lists]...');
const r78 = await callJevSystemOne({
  state: { codebase: fullCodebase },
  questions: {
    issues_7_8: {
      type: 'choice',
      instructions: 'Should regex command and path detection be explicitly framed as defense-in-depth heuristics with optional configurable project deny lists?',
      criteria: {
        document_heuristics_and_add_config: 'Yes: Document as defense-in-depth heuristics and support project-level config/custom deny patterns.',
        claim_absolute_guarantee: 'No: Retain current phrasing.'
      }
    }
  }
});
results.issues_7_8 = r78.answers.issues_7_8;
console.log('Issues 7 & 8 verdict:', r78.answers.issues_7_8);
await delay(1000);

// Issues 9 & 10
console.log('\n[Adjudicating Issues 9 & 10: Documentation tone, benchmark framing, and test artifact hygiene]...');
const r910 = await callJevSystemOne({
  state: { codebase: fullCodebase },
  questions: {
    issue_9: {
      type: 'choice',
      instructions: 'Should README benchmark presentation lead with architectural determinism and independently reproducible metrics rather than self-graded marketing tone?',
      criteria: {
        adopt_neutral_engineering_framing: 'Yes: Adopt neutral engineering tone, clarify Bayesian decision engine context, and report reproducible metrics.',
        keep_promotional_framing: 'No: Keep current benchmark phrasing.'
      }
    },
    issue_10: {
      type: 'choice',
      instructions: 'Should generated test output JSON files be excluded via .gitignore and pruned from repo tracking?',
      criteria: {
        clean_and_gitignore_test_artifacts: 'Yes: Prune generated evaluation output from tracking and add *.json output patterns to .gitignore.',
        keep_all_generated_jsons: 'No: Keep generated JSONs in git tracking.'
      }
    }
  }
});
results.issue_9 = r910.answers.issue_9;
results.issue_10 = r910.answers.issue_10;
console.log('Issue 9 verdict:', r910.answers.issue_9);
console.log('Issue 10 verdict:', r910.answers.issue_10);

const fullReport = {
  timestamp: new Date().toISOString(),
  adjudicator: 'jev-1.13.0',
  endpoint: 'https://api.typesafe.ai/v1/systemone',
  codebase_files_analyzed: allFiles,
  codebase_characters: totalChars,
  verdicts: results
};

fs.writeFileSync(
  path.join(rootDir, 'test', 'jev-review-issues-adjudication.json'),
  JSON.stringify(fullReport, null, 2),
  'utf8'
);

console.log('\n================================================================================');
console.log('ALL 10 REVIEW ISSUES SUCCESSFULLY ADJUDICATED BY JEV SYSTEM ONE');
console.log('Saved to test/jev-review-issues-adjudication.json');
console.log('================================================================================');
