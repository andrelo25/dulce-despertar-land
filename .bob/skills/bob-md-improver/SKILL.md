---
name: bob-md-improver
description: Audit and improve AGENTS.md (or CLAUDE.md) files across a repository. Use when the user asks to check, audit, update, improve, or fix AGENTS.md or CLAUDE.md files. Also use when the user mentions "project memory optimization", "bob.md maintenance", or "agents.md quality".
---

# Bob MD Improver

Audit, evaluate, and improve AGENTS.md / CLAUDE.md files across a codebase so Bob has optimal project context in every session.

**This skill can write to these files.** It always shows a quality report and gets user approval before making any changes.

## Phase 1: Discovery

Find all relevant files:

```bash
find . \( -name "AGENTS.md" -o -name "CLAUDE.md" -o -name ".claude.local.md" \) 2>/dev/null | head -50
```

| Type | Location | Purpose |
|---|---|---|
| Project root | `./AGENTS.md` or `./CLAUDE.md` | Primary project context (git-tracked, shared) |
| Local overrides | `./.claude.local.md` | Personal/local settings (gitignored) |
| Global | `~/.bob/AGENTS.md` | User-wide defaults across all projects |
| Package-specific | `./packages/*/AGENTS.md` | Module context in monorepos |

## Phase 2: Quality Assessment

For each file, score these criteria:

| Criterion | Weight | Check |
|---|---|---|
| Commands/workflows documented | High | Are build/test/deploy commands present? |
| Architecture clarity | High | Can Bob understand the codebase structure? |
| Non-obvious patterns | Medium | Are gotchas and quirks documented? |
| Conciseness | Medium | No verbose or obvious info? |
| Currency | High | Does it reflect the current codebase? |
| Actionability | High | Are instructions copy-paste ready? |

Scores: **A** (90–100) · **B** (70–89) · **C** (50–69) · **D** (30–49) · **F** (0–29)

## Phase 3: Quality Report

**Always output the report BEFORE making any changes.**

```
## AGENTS.md Quality Report

### Summary
- Files found: X
- Average score: X/100
- Files needing update: X

### ./AGENTS.md (Project Root)
**Score: XX/100 (Grade: X)**

Issues:
- [specific problems]

Recommended additions:
- [what should be added]
```

## Phase 4: Propose Changes

After the report, ask for confirmation. Show each change as a diff:

```
### Update: ./AGENTS.md

**Why:** [one-line reason]

\`\`\`diff
+ ## Quick Start
+ \`\`\`bash
+ npm install && npm run dev
+ \`\`\`
\`\`\`
```

**Only add genuinely useful info:**
- Commands or workflows found during analysis
- Gotchas and non-obvious patterns
- Package relationships that aren't obvious
- Configuration quirks

**Never add:**
- Things obvious from the code
- Generic best practices
- Verbose explanations when a one-liner works

## Phase 5: Apply

After approval, apply with targeted edits. Preserve existing structure.

## What makes a great AGENTS.md

- Concise and human-readable
- Commands that can be copy-pasted directly
- Project-specific gotchas, not generic advice
- Non-obvious patterns and warnings

Recommended sections (only what's relevant): Commands · Architecture · Key Files · Code Style · Environment · Testing · Gotchas · Workflow
