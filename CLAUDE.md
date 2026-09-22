# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
- When your changes create orphans: Remove imports/variables/functions that your changes made unused.
- The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
- Transform tasks into verifiable goals:
  - "Add validation" -> "Write tests for invalid inputs, then make them pass"
  - "Fix the bug" -> "Write a test that reproduces it, then make them pass"
  - "Refactor X" -> "Ensure tests pass before and after"
- For multi-step tasks, state a brief plan:
```
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```
- Deterministic Verification: Run the automated test suite (`npm test`) before declaring any task complete.

## 5. Token Efficiency & Context Protection
- Universal Research Sandboxing: When reading multi-file documentation (Obsidian vaults, markdown notes, PDF specs, Excel/CSV datasets, or multi-query web searches), never dump raw files or scraped search outputs directly into coordinator context. Delegate bulk research to an ephemeral subagent that distills findings into a compact <1,500 token summary artifact (RESEARCH.md) and terminates. The coordinator only reads the summary artifact once.
- Focal Chunking: When inspecting code files, use targeted line slices (StartLine/EndLine) or symbol grep rather than loading entire multi-thousand-line files.
- Supervisor Coordination: Do not poll subagent or task status in an active loop. Stop calling tools and rely on reactive wakeups.
