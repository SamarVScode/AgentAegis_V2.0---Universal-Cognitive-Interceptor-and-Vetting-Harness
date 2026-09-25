# Aegis Harness Remediation Checklist

**Total Verified Real Issues**: 38  
**Adjudication Engine**: TypeSafe AI Jev System One (`jev-1.13.0`)  
**Status**: In Progress  

---

## Batch 1: P0 Critical Crashes & Bypasses
- [x] **Item 1 (`interceptor.js`)**: TDZ `ReferenceError`: `isDestructive` and `cmdStr` referenced in Step 0b before lexical `const` declaration.
- [x] **Item 2 (`interceptor.js`)**: `--engine` absent causes `indexOf` `-1` -> drops `rawArgs[0]`, defaulting mode to `pre-tool`.
- [x] **Item 3 (`install.js`)**: `runInstall` runs `JSON.parse(results[0].content)` which throws on Cursor Markdown frontmatter.
- [x] **Item 4 (`acceptance-gate.js`)**: `SAFE_RUNNERS` regex fails on `npx tsc`, `npx clasp`, `.venv/bin/pytest`, `poetry run pytest`.
- [x] **Item 5 (`.agents/hooks.json`)**: Legacy `aegis-guard` wrapper in repo root replaced with standard `hooks` schema.
- [x] **Item 6 (`install.js`)**: Strip leading UTF-8 BOM (`\uFEFF`) before `JSON.parse` to prevent wiping existing hooks on Windows.
- [x] **Jev Verification Batch 1**: Approved by Jev System One ($P = 0.81$, commit `df6b826`).

---

## Batch 2: P1 High Severity - Lifecycle Telemetry, Security & Installer
- [x] **Item 7 (`interceptor.js`)**: `readStdinJson` raw `process.exit(2)` on destructive pattern replaced with proper sentinel/audit/JSON response.
- [x] **Item 8 (`interceptor.js`)**: Persist `userGoal` / task description into `session.json` so Stop hook inherits Pillar 1 across process boundaries.
- [x] **Item 9 (`state-collector.js`)**: Pass `effectiveWorkspace` as `cwd` to git commands and ecosystem detection instead of defaulting to `process.cwd()`.
- [x] **Item 13 (`interceptor.js`)**: Post-tool handler recognizes `run_command` (Antigravity) and `terminal` (Cursor) in addition to `Bash`.
- [x] **Item 14 (`install.js`)**: Antigravity installer merges hook entries rather than replacing the arrays.
- [x] **Item 15 (`install.js`)**: Auto-append `.env` to `.gitignore` when `.env` is created to prevent secret leaks.
- [x] **Item 19 (`.agents/hooks.json` & `install.js`)**: Install `PostToolUse` hook for Antigravity so test execution status is tracked.
- [x] **Item 20 (`.agents/hooks.json` & `interceptor.js`)**: Pass conversation/agent context or parse transcript in Stop hook for Lie Detector reconciliation.
- [x] **Jev Verification Batch 2**: Approved by Jev System One ($P = 0.65$, input tokens 7864).

---

## Batch 3: P1 & P2 Quality, Variance & Exfiltration
- [ ] **Item 10 (`diff-variance.js`)**: Scope comment stripping so URLs (`https://`), hex colors (`#fff`), and `#include` are preserved.
- [ ] **Item 11 (`jev-client.js`)**: Cap retry backoff budget to 3 retries max and 10s ceiling to prevent 95s hook latency.
- [ ] **Item 12 (`jev-client.js`)**: Distinguish 401 Unauthorized API key errors from transient network errors (fail-closed on invalid key).
- [ ] **Item 16 (`sensitive-guard.js`)**: Scope `inspectCommandForSensitivePaths` so `.pem` inside quotes/git messages doesn't force destructive fail-closed.
- [ ] **Item 17 (`cycle-detector.js`)**: Atomic temp-file write + rename for session state to prevent corruption.
- [ ] **Item 18 (`cycle-detector.js`)**: File-based timestamp throttling for `pruneOldSessions` across independent CLI processes.
- [ ] **Item 38 (`sensitive-guard.js`)**: Fix `.aegis-harness` regex to match bare path without trailing slash requirement.
- [ ] **Jev Verification Batch 3**: Pending Jev Bayesian adjudication ($P \ge 0.80$).

---

## Batch 4: P2 Parser Robustness & Hardening
- [ ] **Item 21 (`acceptance-gate.js`)**: `RESTRICTED_PATTERNS` only checks executable command, not narrative agent statement.
- [ ] **Item 22 (`acceptance-gate.js`)**: Remove dead `err.code_name` clause and clarify `isMaxBuffer` logic.
- [ ] **Item 23 (`acceptance-gate.js`)**: Windows process tree termination using `taskkill /T /F` on timeout.
- [ ] **Item 24 (`runner-parser.js`)**: Multiline regex flag `/m` for spoof detection.
- [ ] **Item 25 (`runner-parser.js`)**: Fallback for clean exit code 0 when runner produces unrecognized or JSON output.
- [ ] **Item 26 (`runner-parser.js`)**: GAS `clasp status` semantic clarification (distinguish build check from unit tests).
- [ ] **Item 27 (`acceptance-gate.js`)**: Claim extraction regex filters out version numbers like `1.0`, `v1.2`.
- [ ] **Item 29 (`state-collector.js`)**: `extractArtifactContract` resolves paths against `workspaceRoot`.
- [ ] **Item 30 (`state-collector.js`)**: Stream/tail read large JSONL transcripts (last 100KB) instead of loading multi-MB files into memory.
- [ ] **Item 31 (`state-collector.js`)**: Safe JSON serialization with circular reference guard in `compressToolHistory`.
- [ ] **Item 32 (`decision-tracker.js`)**: Clean up unused `sessionId` parameter in `getAuditLogPath`.
- [ ] **Item 33 (`interceptor.js`)**: Use `import.meta.url` for entrypoint check instead of `endsWith('interceptor.js')`.
- [ ] **Item 34 (`interceptor.js`)**: `safeParseJson` only replaces single quotes in key/value delimiters, preserving apostrophes.
- [ ] **Item 35 (`install.js`)**: Dynamic file counting and recursive copying for harness modules.
- [ ] **Item 36 (`install.js`)**: Change Claude hook from `PrePrompt` to `UserPromptSubmit`.
- [ ] **Item 37 (`core-laws-linter.js`)**: Strip string literals and comments before invariant regex matching.
- [ ] **Item 39 (`interceptor.js`)**: Clean up dead `readStdinJson(timeoutMs)` setTimeout branch.
- [ ] **Jev Verification Batch 4**: Pending Jev Bayesian adjudication ($P \ge 0.80$).
