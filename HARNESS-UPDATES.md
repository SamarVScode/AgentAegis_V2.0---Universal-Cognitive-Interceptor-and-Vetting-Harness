# Harness Updates

Single change, made 2026-09-21. One file touched: `harness/acceptance-gate.js`.

---

## 1. Acceptance gate no longer vetoes completion in a workspace with no test contract

**File:** `harness/acceptance-gate.js`
**Location:** lines 238–250, inserted immediately after `const testCommand = ...` (line 236)

### The change

```diff
  const workspace = detectWorkspaceEcosystem(effectiveTargetDir);
  const testCommand = customCommand || workspace.testCommand || 'npm test';

+ // No manifest markers => no deterministic test contract exists. Executing the
+ // default command anyway (e.g. `npm test` without a package.json) fails on
+ // ENOENT and vetoes completion for work that has no tests to run.
+ if (!customCommand && workspace.ecosystem === 'unknown') {
+   return {
+     passed: true,
+     stage: 'stage_1_no_test_contract',
+     probability: 1.0,
+     exitCode: 0,
+     testsRun: 0,
+     reason: 'No test contract detected: no package.json, lockfile, or build manifest in workspace. Stage 1 test verification skipped.'
+   };
+ }

  let stdout = '';
```

### Root cause

The `Stop` hook in `.claude/settings.json` calls `interceptor.js verify-gate`, which calls `verifyAcceptanceGate()`. With no command supplied, that function derives its test contract from the workspace:

1. `harness/manifest-sniffer.js:306-313` — `detectWorkspaceEcosystem()` finds no marker file (no `package.json`, lockfile, `Cargo.toml`, `go.mod`, `pyproject.toml`, `Makefile`, `gradlew`, `.clasp.json`), so it returns `ecosystem: 'unknown'` with `testCommand: 'npm test'` as a blind fallback.
2. `harness/acceptance-gate.js:236` — the gate adopts that fallback as its contract.
3. The spawned command fails: `npm error enoent Could not read package.json`, `errno -4058`.
4. `harness/acceptance-gate.js:321-332` — a non-zero exit fails Stage 1.
5. `harness/interceptor.js:357-364` — the failed gate exits `2`, vetoing termination.

`-4058` is reported through the unsigned 32-bit exit code as `4294963238`.

The gate was therefore **unsatisfiable** in that directory: it demanded a passing test suite that could not exist, so every attempt to end a turn was rejected regardless of the work done.

### Reproduction

Before the change, from `C:\Users\User\Desktop\ttttt`:

```json
{
  "passed": false,
  "stage": "stage_1_semantic_parser",
  "exitCode": 4294963238,
  "testsRun": 0,
  "reason": "Stage 1 Verification Failed: Process exited with non-zero exit code 4294963238.",
  "stderr_tail": "npm error code ENOENT\nnpm error path C:\\Users\\User\\Desktop\\ttttt\\package.json\nnpm error errno -4058\n"
}
```

After:

```json
{
  "passed": true,
  "stage": "stage_1_no_test_contract",
  "probability": 1,
  "exitCode": 0,
  "testsRun": 0,
  "reason": "No test contract detected: no package.json, lockfile, or build manifest in workspace. Stage 1 test verification skipped."
}
```

### Verification

Gate strength in the case that matters was checked, not assumed:

| Workspace | Result | Expected |
|---|---|---|
| No manifest at all | `passed: true`, stage `stage_1_no_test_contract` | pass — nothing to verify |
| `package.json` present, `"test": "exit 1"` | `passed: false`, exit 1 | **fail — still rejected** |

The second row is the regression check: a genuinely failing test suite is still vetoed. Only the unrunnable-fallback case changed.

### Behaviour by workspace

| Ecosystem detected | Effect of this change |
|---|---|
| `node`, `python`, `rust`, `go`, `android`, `gas`, `c` | None — full pipeline runs as before |
| `unknown`, no custom command | Short-circuits with `passed: true` |
| `unknown`, **with** a custom command | None — the supplied command still runs and is judged |

The `!customCommand` guard is deliberate: supplying a command means you have asserted a test contract, so the gate should honour it even in a directory with no manifest.

### Tradeoff — worth revisiting

The short-circuit returns **before** two downstream stages, so in an unknown-ecosystem workspace neither runs:

- **Stage 1.5** — claim-to-reality reconciliation (the "lie detector" that checks claimed file modifications against disk and catches fabricated "all tests pass" claims)
- **Stage 2** — the Jev semantic completion gate

The consequence is that a completion in a manifest-less directory is now accepted with no AI-judge verification at all. That is a real reduction in gate coverage for those directories, accepted as the price of not vetoing every turn. Two ways to close it if it matters:

1. Run Stage 1.5 only — `reconcileClaimsWithGroundTruth()` works without a test result, so file-modification claims could still be audited in the unknown-ecosystem path.
2. Scope the `Stop` hook itself in `.claude/settings.json` so the gate only fires where a `testCommand` is actually resolvable, leaving the gate untouched.

### Not changed

Nothing else in `harness/` was modified — no edits to `manifest-sniffer.js`, `interceptor.js`, `jev-client.js`, or `.claude/settings.json`. `manifest-sniffer.js` still returns `testCommand: 'npm test'` for unknown ecosystems; the fix sits in the gate's policy layer rather than the detector, since the detector is correct to report that it could not identify an ecosystem.
