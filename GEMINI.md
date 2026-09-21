# TypeSafe AI Jev Guardrails Active

> [!NOTE]
> This workspace is actively monitored by the **TypeSafe AI Jev Interceptor Harness** and **Jev MCP Server**.

## Operational Guidelines
1. **Zero Thrashing**: If Jev or the cycle detector issues a warning or veto regarding repetitive edits, immediately halt and pivot your implementation strategy. Do not retry identical modifications.
2. **Deterministic Verification**: Prior to declaring any task complete, run the project's automated test suite (`npm test`) to satisfy the Jev Acceptance Gate.
3. **Bounded Context**: Keep diffs and outputs concise. Do not dump multi-megabyte log files into conversation context.
4. **Universal Research Sandboxing**: For multi-file documentation (Obsidian vaults, markdown directories, PDF specs, Excel/CSV datasets, or multi-query web searches), do not dump raw files or scraped HTML into coordinator context. Delegate bulk research to an ephemeral subagent that produces a compact `<1,500` token summary artifact (`RESEARCH.md`).
5. **Focal Chunking & Supervisor Efficiency**: Inspect code using targeted line slices (`StartLine`/`EndLine`). Never poll subagents or tasks in an active loop; rely on reactive wakeups or schedule timers.

