# Harness Diagnosis

Runtime audit of the Aegis/JEV harness during a working session on 2026-09-21.
Method: reading the call sites in `harness/`, plus inspecting the on-disk evidence trail the harness leaves behind.

Companion document: `HARNESS-UPDATES.md` records the one code change made. **This file records findings only — no code was changed as a result of it.**

---

## 1. Question asked

Was JEV participating in tool calls and decisions throughout the session?

**Answer: No.** The harness was live and watching every tool call. JEV itself was consulted **once**, on a scratch-directory cleanup, and never on anything that shaped a decision.

---

## 2. Where JEV can be reached

JEV is invoked only via `jevBooleanCheck()`. It has exactly two call sites in the harness:

| # | Call site | Condition to reach it | Reached this session? |
|---|---|---|---|
| 1 | `interceptor.js:300-319` (pre-tool, Step 4) | `isDestructiveAction(toolName, toolArgs)` must return `true` | **Once** — `rm -rf "$TMP"` temp cleanup |
| 2 | `acceptance-gate.js:371` (verify-gate, Stage 2) | Stage 1 must pass **and** `testsRun !== 0` | **Never** |

Everything else — reads, greps, file writes, edits, globs — exits the interceptor before any JEV call. There is no call site anywhere in the harness that asks JEV about a design decision, a file's contents, or a plan.

### Why path 2 was never reached

`acceptance-gate.js` returns before line 371 in every run this session:

- The single `Stop` rejection: Stage 1 failed on a non-zero exit → returned at `321-332`.
- After the fix in `HARNESS-UPDATES.md`: returns at `241-250`, before the test spawn.
- The regression check (failing `package.json` test): Stage 1 failed → returned at `321-332`.

So the JevCompletion gate issued **no verdict** at any point.

### The one consultation, and why it passed

The destructive classifier (`jev-client.js:48-133`) was tested directly against the commands actually run:

| Command | Classified | Consequence |
|---|---|---|
| `rm -rf "$TMP"` (temp cleanup) | **DESTRUCTIVE** | JEV consulted |
| `node ./harness/acceptance-gate.js 2>&1 \| head -40` | benign | no JEV call |
| `ls -la ~/.aegis-harness/` | benign | no JEV call |
| `find ~/.aegis-harness -name session.json` | benign | no JEV call |

The matching pattern is `/\brm\s+-[a-z]*r[a-z]*f?/i` (`jev-client.js:66`), which matches the literal `rm -rf` regardless of the variable target.

Because the command executed successfully, JEV must have approved it. Had JEV errored or timed out, `handleBipartiteFailSafe()` (`jev-client.js:140-162`) fails **closed** for destructive operations and would have blocked the command with exit 2.

**Note:** JEV verdicts are not logged anywhere, so this is inferred from the code path plus the command's observed success, not read from a record.

### Credentials confirmed present

JEV was genuinely reachable, not silently failing:

```
TYPESAFE_API_KEY         SET
OPENROUTER_API_KEY       unset
TYPESAFE_BASE_URL        unset
resolved endpoint        api.typesafe.ai/v1/systemone
```

With `TYPESAFE_API_KEY` set, `callJevSystemOne()` routes to the native TypeSafe endpoint with model `jev-1.13.0` (`jev-client.js:38-41, 180-182`). Timeout is 5000 ms with 2 retries.

---

## 3. Confirmation the harness was running

The `PreToolUse` hook fired. Evidence: 21 session directories created inside a ~5-minute window, each containing a `session.json`:

```
21 session dirs under ~/.aegis-harness/cwd-c0a58630-*/
21 of them contain session.json
all mtimes between 10:42 and 10:47 on 2026-09-21
```

`cwd-c0a58630` is the sha256 of `C:\Users\User\Desktop\ttttt` truncated to 8 chars. `session.json` is written by `saveSession()` (`cycle-detector.js:156-161`), which `checkCycle()` triggers on the pre-tool path — so those files are direct proof the pre-tool hook ran.

---

## 4. Finding A — session fragmentation disables the cycle detector

**Severity: the thrashing circuit breaker never engages.**

Every session directory contained **exactly one** history entry:

```
dirs with session.json : 21
history entries per dir: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
max entries in any dir : 1
```

A sample `session.json`:

```json
{
  "rollingHistory": [
    { "key": "Bash:", "tool": "Bash", "targetFile": "", "variance": 0, "timestamp": 1789967838797 }
  ],
  "fileEditSnapshots": {}
}
```

### Cause

The session ID is computed at `interceptor.js:165-171`:

```js
const sessionId = process.env.AEGIS_SESSION_ID ||
                  process.env.CONVERSATION_ID ||
                  process.env.CLAUDE_CONVERSATION_ID ||
                  process.env.CURSOR_SESSION_ID ||
                  sessionFromFile ||
                  (`cwd-${cwdHash}${ppidSuffix}`);
```

None of the environment variables are set, and no `.aegis-session` file exists, so every invocation falls through to `cwd-<hash>-p<ppid>`. **`process.ppid` differs on each hook invocation** — each is a fresh `node` process — so every tool call lands in its own bucket and history never accumulates.

### Consequence

`checkCycle()` compares an incoming edit against `rollingHistory` to detect the 3-vs-5 thrashing pattern. With a ceiling of one entry per session, the comparison set is always empty or trivially small, so the circuit breaker can never observe a repeated edit and never fires. `fileEditSnapshots` is likewise always empty, which also disables the virtual shadow buffer's cross-call reconstruction.

**The fix direction:** derive `sessionId` from something stable per conversation — export `AEGIS_SESSION_ID` / `CLAUDE_CONVERSATION_ID` into the hook environment, or drop the `-p<ppid>` suffix and key on the cwd hash alone. Either restores a single accumulating history.

---

## 5. Finding B — `PostToolUse` is not configured, so failure tracking is dead

`.claude/settings.json` wires only two hooks:

```json
"PreToolUse": [ ... "pre-tool" ],
"Stop":       [ ... "verify-gate" ]
```

There is **no `PostToolUse` entry**. The interceptor's post-tool branch (`interceptor.js:328-341`) is therefore unreachable:

```js
session.lastStderr = stderr.slice(-1500);
saveSession(session, sessionId);
```

`lastStderr` is never populated — confirmed in the trail: the newest `session.json` has no `lastStderr` key at all.

### Consequence

The Stage 1.5 "lie detector" has two fallbacks that read session state, and both are permanently unreachable:

| Location | Check | Status |
|---|---|---|
| `acceptance-gate.js:151-158` | `safeSession.lastTestPassed === false` | never set → never fires |
| `acceptance-gate.js:180-188` | `safeSession.lastBuildFailed` | never set → never fires |

Neither variable is ever assigned anywhere in the harness, so even adding `PostToolUse` would not populate them — the branch writes `lastStderr` only. The reconciliation engine is left depending entirely on `testRunResult` passed in at call time.

---

## 6. What JEV is, architecturally

Worth stating plainly, since it bears on the question asked: JEV in this harness is **not a collaborator or advisor**. It is a two-purpose checkpoint:

1. **Veto destructive commands** — a binary safety gate on `rm -rf`, `git reset`, `DROP`, `kill`, etc.
2. **Judge test completion** — a probability check (`P >= 0.85`) that the test run represents success.

There is no wiring by which JEV reviews a plan, a design choice, or a file's contents. Decisions about what to build and how are made upstream of the harness entirely.

---

## 7. Confidence

| Claim | Basis |
|---|---|
| Pre-tool hook fired repeatedly | **Measured** — 21 session dirs with `session.json` |
| JEV credentials present and reachable | **Measured** — env probe |
| Verify-gate never reached its JEV stage | **Code path analysis** — early returns at `321-332` / `241-250` |
| Exactly one pre-tool JEV consultation | **Code path + classifier test** — one command matched; verdicts unlogged |
| That consultation approved | **Inferred** — the command succeeded, and failure fails closed |
| Cycle detector cannot fire | **Measured** — max 1 history entry across all 21 sessions |
| `lastStderr` never written | **Measured** — absent from `session.json`, and no `PostToolUse` hook configured |

---

## 8. Not investigated

- `pruneOldSessions()` (`cycle-detector.js:94+`) runs on each save; its retention threshold was not read, so the steady-state number of session dirs is unknown.
- `state-collector.js`, `sensitive-guard.js`, `core-laws-linter.js`, `diff-variance.js`, `runner-parser.js`, `jev-vetter.js` and `install.js` were not audited.
- Whether `core-laws-linter.js` is rejecting any edits — no lint output was observed during the session, which is consistent with either clean code or a silent no-op.
