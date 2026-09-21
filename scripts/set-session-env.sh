#!/usr/bin/env bash
# scripts/set-session-env.sh
#
# SESSION FRAGMENTATION FIX (Phase 1)
#
# Problem: interceptor.js derives the fallback session ID as cwd-<hash>-p<ppid>.
# process.ppid changes on every fresh node invocation (each Claude Code hook
# spawns a new node process). This results in a new session bucket per tool call,
# making cycle-detector.js rollingHistory permanently trivial (1 entry per bucket).
#
# Fix: Export CLAUDE_CONVERSATION_ID from the hook environment so interceptor.js
# reads it as the stable session ID. The priority chain in interceptor.js already
# checks CLAUDE_CONVERSATION_ID (slot 3) before the ppid fallback (slot 6):
#
#   AEGIS_SESSION_ID || CONVERSATION_ID || CLAUDE_CONVERSATION_ID ||
#   CURSOR_SESSION_ID || sessionFromFile || cwd-<hash>-p<ppid>
#
# Tradeoff (Jev 1b confirmed at 0.92):
#   Dropping ppidSuffix entirely (cwd-only key) would re-introduce concurrent-agent
#   session collision (Issue #6). The env-export approach avoids this: each Claude
#   session has a unique CLAUDE_CONVERSATION_ID, so concurrent agents in the same
#   cwd are correctly isolated.
#
# Usage for Claude Code (add to .claude/settings.json hooks or run before agent):
#   export CLAUDE_CONVERSATION_ID="your-stable-session-id"
#
# To configure via .claude/settings.json hook env block, add:
#   {
#     "hooks": {
#       "PreToolUse": [{
#         "matcher": ".*",
#         "hooks": [{
#           "type": "command",
#           "command": "CLAUDE_CONVERSATION_ID=$CLAUDE_SESSION_ID node harness/interceptor.js --engine claude pre-tool"
#         }]
#       }],
#       "Stop": [{
#         "matcher": ".*",
#         "hooks": [{
#           "type": "command",
#           "command": "CLAUDE_CONVERSATION_ID=$CLAUDE_SESSION_ID node harness/interceptor.js --engine claude verify-gate"
#         }]
#       }]
#     }
#   }
#
# Or source this file at shell startup:
#   source scripts/set-session-env.sh
#
# Claude Code exposes CLAUDE_SESSION_ID (or equivalent) in the hook environment.
# Map it to CLAUDE_CONVERSATION_ID which interceptor.js reads natively.

if [ -n "$CLAUDE_SESSION_ID" ] && [ -z "$CLAUDE_CONVERSATION_ID" ]; then
  export CLAUDE_CONVERSATION_ID="$CLAUDE_SESSION_ID"
fi

if [ -n "$CLAUDE_CONVERSATION_ID" ]; then
  echo "[AEGIS SESSION]: CLAUDE_CONVERSATION_ID=$CLAUDE_CONVERSATION_ID (stable session ID active)"
else
  echo "[AEGIS SESSION WARNING]: CLAUDE_CONVERSATION_ID not set. Falling back to cwd-hash-ppid (session fragmentation risk)."
  echo "  Set AEGIS_SESSION_ID=<stable-id> or export CLAUDE_CONVERSATION_ID=<your-session-id> to fix."
fi
