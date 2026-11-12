---
name: code-review
description: Automated multi-agent code review for a pull request. Launches parallel agents to audit CLAUDE.md compliance, scan for bugs, check git history context, review past PRs, and validate code comments. Use when the user says "review this PR", "code review pull request", or invokes /code-review with a PR number or URL.
---

# Code Review

Provide a thorough code review for the given pull request using parallel agents.

## GitHub Access Strategy

**Detect which method is available before starting, then use that method consistently throughout.**

### Priority order

1. **`gh` CLI (preferred when available)** — faster, fewer roundtrips, handles pagination internally, single call for full diff.
   - Check availability: `gh auth status` succeeds and the hostname matches the repo's remote.
   - For GitHub Enterprise repos (e.g. `github.ibm.com`), check: `gh auth status --hostname <ghe-hostname>`.
   - Key commands:
     - `gh pr view <number> --json state,isDraft,title,headRefOid,author` — PR metadata
     - `gh pr diff <number>` — full patch in one call
     - `gh pr list --repo <owner>/<repo> --state all --json number,files` — PR history
     - `gh pr comment <number> --body "..."` — post comment
     - `gh pr reviews <number>` — list existing reviews

2. **GitHub MCP tools (fallback when `gh` is unavailable or not authenticated for the target host)** — works without local tooling, structured JSON responses.
   - **Only usable for `github.com` repos** — the standard MCP server does not support GitHub Enterprise (`github.ibm.com` or custom GHE hostnames).
   - Key tools:
     - `mcp__github__get_pull_request` — PR metadata
     - `mcp__github__get_pull_request_files` — changed files + patch
     - `mcp__github__get_pull_request_comments` / `mcp__github__get_pull_request_reviews`
     - `mcp__github__list_pull_requests` — PR history
     - `mcp__github__get_file_contents` — file content at a ref
     - `mcp__github__list_commits` — commit history
     - `mcp__github__create_pull_request_review` with `event: "COMMENT"` — post review

### Detection logic (run once at the start)

```
1. Extract hostname from git remote URL (e.g. github.ibm.com or github.com)
2. Run: gh auth status --hostname <hostname>
   - If exit 0 → use gh CLI for all steps
   - If exit 1 AND hostname == github.com → use MCP tools for all steps
   - If exit 1 AND hostname != github.com → STOP and tell the user:
       "gh CLI is not authenticated for <hostname>. Run:
        gh auth login --hostname <hostname> --git-protocol https
       MCP fallback is not available for GitHub Enterprise."
```

## Steps

1. **Eligibility check** — Use a fast agent to check if the PR: (a) is closed, (b) is a draft, (c) doesn't need review (automated PR, trivially simple), or (d) already has a review from you. If any of those, stop.

2. **Find guide files** — Use another fast agent to return a list of paths to relevant `CLAUDE.md` or `AGENTS.md` files: the root one plus any in directories touched by the PR.

3. **Summarize** — Use a fast agent to view the PR diff and return a plain summary of the change.

4. **Parallel review** — Launch 5 parallel agents to independently review the change. Each returns a list of issues with a reason:
   - **Agent 1** — Audit changes against `CLAUDE.md`/`AGENTS.md`. Note: these are guidance for Bob writing code, not all rules apply to review.
   - **Agent 2** — Shallow scan for obvious bugs in the diff only. Ignore context beyond the changes. Focus on large bugs, skip nitpicks and likely false positives.
   - **Agent 3** — Read git history of modified files to find bugs that only make sense in historical context.
   - **Agent 4** — Read previous PRs that touched these files, check for review comments that also apply to this PR.
   - **Agent 5** — Read code comments in modified files, verify the changes comply with inline guidance.

5. **Score issues** — For each issue from step 4, launch a parallel fast agent that scores it 0–100 for confidence:
   - **0** — False positive, doesn't survive light scrutiny, or pre-existing issue.
   - **25** — Might be real, unverified. Stylistic issues not explicitly in CLAUDE.md.
   - **50** — Real but minor or rare in practice. Low importance relative to the PR.
   - **75** — Verified, very likely real, hits in practice. Important or directly in CLAUDE.md.
   - **100** — Confirmed, happens frequently, evidence is direct.

6. Filter out any issue with score < 80. If none remain, stop — do not comment.

7. Re-run the eligibility check from step 1.

8. **Post review** — Post a comment on the PR **in Spanish**. Keep it brief, no emojis. Cite and link each issue with a full SHA + line range.
   - With `gh`: `gh pr comment <number> --body "..."`
   - With MCP: `mcp__github__create_pull_request_review` with `event: "COMMENT"`

## Output format

All PR comments must be written in Spanish.

```
### Code review

Se encontraron N problemas:

1. <descripción breve> (CLAUDE.md dice "<...>")
   https://github.com/<owner>/<repo>/blob/<full-sha>/<file>#L<start>-L<end>

2. <descripción breve> (bug debido a <archivo y fragmento>)
   https://github.com/<owner>/<repo>/blob/<full-sha>/<file>#L<start>-L<end>

🤖 Generated with IBM Bob

---
Si fue útil, reacciona con 👍. Si no, con 👎.
```

If no issues found:
```
### Code review

No se encontraron problemas. Se verificaron bugs y cumplimiento de CLAUDE.md.

🤖 Generated with IBM Bob
```

## False positive examples (do not report these)

- Pre-existing issues
- Something that looks like a bug but isn't
- Pedantic nitpicks a senior engineer wouldn't call out
- Things a linter/typechecker/CI would catch (imports, types, formatting)
- General quality issues (test coverage, docs) unless in CLAUDE.md
- CLAUDE.md issues explicitly silenced in code (e.g. lint-ignore comment)
- Intentional behavioral changes directly related to the PR's goal
- Real issues on lines the user did not modify

## Notes

- **Never use web fetch** to call GitHub APIs directly
- Make a todo list first
- Link format: `https://<hostname>/<owner>/<repo>/blob/<full-sha>/<file>#L<start>-L<end>`
  - Requires full git SHA — no shell substitution in URLs
  - Provide at least 1 line of context before and after the flagged line
- `owner`, `repo`, and `hostname` can be extracted from `git remote get-url origin`
