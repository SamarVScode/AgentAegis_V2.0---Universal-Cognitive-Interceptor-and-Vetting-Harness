import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const relevantCode = {
  'harness/core-laws-linter.js': fs.readFileSync(path.join(rootDir, 'harness/core-laws-linter.js'), 'utf8'),
  'harness/interceptor.js': fs.readFileSync(path.join(rootDir, 'harness/interceptor.js'), 'utf8'),
  'harness/jev-client.js': fs.readFileSync(path.join(rootDir, 'harness/jev-client.js'), 'utf8'),
  'harness/sensitive-guard.js': fs.readFileSync(path.join(rootDir, 'harness/sensitive-guard.js'), 'utf8')
};

const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8').slice(0, 4000);
const reviewDoc = fs.readFileSync(path.join(rootDir, 'AgentAegis_Review_Issues.md'), 'utf8');

console.log('--- ADJUDICATING REVIEWER CLAIMS ON ISSUES #2, #6, #7, #8 WITH JEV SYSTEM ONE ---');

const res = await callJevSystemOne({
  state: {
    codebase: relevantCode,
    readme_sample: readme,
    review_issues: reviewDoc
  },
  questions: {
    adjudicate_issue_2: {
      type: 'choice',
      instructions: 'Reviewer claims Issue 2 (core-laws-linter.js is a dead stub) is NOT fixed. Is the reviewer right, or is it fixed in code?',
      criteria: {
        reviewer_is_wrong_issue_2_is_fixed: 'Reviewer is Wrong: core-laws-linter.js is no longer a dead stub. It actively checks real code invariants (eval, private keys, prototype pollution, GAS laws) and is wired into interceptor.js with pragma bypass.',
        reviewer_is_right_issue_2_still_broken: 'Reviewer is Right: core-laws-linter.js is still an inactive dead stub that always returns clean: true.'
      }
    },
    adjudicate_issue_6: {
      type: 'choice',
      instructions: 'Reviewer claims Issue 6 (session scoping fails when no conversation ID is set, causing cwd collision) is NOT fixed. Is the reviewer right, or is it fully fixed?',
      criteria: {
        reviewer_is_right_issue_6_still_collides: 'Reviewer is Right: In interceptor.js line 169, when no env var or file exists, sessionId still falls back to cwd-hash, causing parallel runs in the same directory to collide.',
        reviewer_is_wrong_issue_6_is_fixed: 'Reviewer is Wrong: Sessions are completely isolated per process and cannot collide even in the same directory.'
      }
    },
    adjudicate_issue_7: {
      type: 'choice',
      instructions: 'Reviewer claims Issue 7 (regex-based destructive command detection is inherently bypassable by scripts/aliases/obfuscation) was not fixed. Is the reviewer right about the inherent limitation?',
      criteria: {
        reviewer_is_right_regex_cannot_guarantee_security: 'Reviewer is Right: Regex pattern matching on raw command strings is fundamentally an incomplete heuristic layer that can be bypassed by scripts, aliases, or stdlib calls. It is not an OS sandbox.',
        reviewer_is_wrong_regex_is_bulletproof: 'Reviewer is Wrong: The regex filter is comprehensive and impossible to bypass.'
      }
    },
    adjudicate_issue_8: {
      type: 'choice',
      instructions: 'Reviewer claims Issue 8 (sensitive-path regex list has the same fundamental limitation) was not fixed. Is the reviewer right?',
      criteria: {
        reviewer_is_right_path_patterns_are_heuristic: 'Reviewer is Right: A static list of path regexes is an incomplete defense-in-depth heuristic that cannot foresee all secret naming conventions without OS-level file monitoring or user-defined deny lists.',
        reviewer_is_wrong_path_patterns_are_exhaustive: 'Reviewer is Wrong: The sensitive path pattern list guarantees complete exfiltration prevention.'
      }
    }
  },
  timeoutMs: 90000
});

console.log('JEV SYSTEM ONE ADJUDICATION RESULTS:');
console.log(JSON.stringify(res.answers, null, 2));

fs.writeFileSync(
  path.join(rootDir, 'test', 'jev-reviewer-adjudication.json'),
  JSON.stringify(res.answers, null, 2),
  'utf8'
);
