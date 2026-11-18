---
name: revise-bob-md
description: Update AGENTS.md (or CLAUDE.md) with learnings from the current session. Use when the user says "update the docs", "save learnings", "revise agents.md", "update claude.md", or at the end of a session to capture useful context for future sessions.
---

# Revise Bob MD

Review this session for learnings that would help future Bob sessions work more effectively in this codebase. Update AGENTS.md (or CLAUDE.md) with that context.

## Step 1: Reflect

What context was missing that would have helped Bob work more effectively?
- Bash commands discovered or used
- Code style patterns followed
- Testing approaches that worked
- Environment/configuration quirks
- Warnings or gotchas encountered

## Step 2: Find the files

```bash
find . -name "AGENTS.md" -o -name "CLAUDE.md" -o -name ".claude.local.md" 2>/dev/null | head -20
```

Decide where each addition belongs:
- `AGENTS.md` / `CLAUDE.md` — team-shared, checked into git
- `.claude.local.md` — personal/local only, gitignored

## Step 3: Draft additions

**Keep it concise** — one line per concept. These files are part of every prompt, so brevity matters.

Format: `<command or pattern>` — `<brief description>`

Avoid:
- Verbose explanations
- Obvious information
- One-off fixes unlikely to recur

## Step 4: Show proposed changes

For each addition:

```
### Update: ./AGENTS.md

**Why:** [one-line reason]

\`\`\`diff
+ [the addition — keep it brief]
\`\`\`
```

## Step 5: Apply with approval

Ask if the user wants to apply the changes. Only edit files they approve.
