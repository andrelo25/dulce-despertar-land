---
name: spec-driven-development
description: >
  Build a feature from a written spec instead of improvising. Turns a requirement
  (a DT/FE doc, a ticket, or a loose ask) into a small chain of reviewable artifacts —
  spec → plan → tasks → implement → verify — where each step is approved before the
  next. Use when the user says "spec-driven", "spec first", "SDD", "plan this feature
  properly", "write the spec", "break this into tasks", or hands you a requirements
  doc and asks to implement it.
---

# Spec-Driven Development

Don't jump to code. Produce short, reviewable artifacts in order. Each is a gate:
the user approves before you move on. This front-loads the disagreements to when
they're cheap (prose) instead of expensive (a merged PR).

## The chain

```
1. SPECIFY   → what & why (no how)      → gate: user approves scope
2. CLARIFY   → resolve ambiguities      → gate: no open [NEEDS-CLARIFICATION]
3. PLAN      → how (arch, contracts)    → gate: user approves approach
4. TASKS     → ordered, testable units  → gate: each task independently verifiable
5. IMPLEMENT → one task at a time       → gate: task's test passes before next
6. VERIFY    → exercise end-to-end      → gate: acceptance criteria met
```

Stop at each gate. Don't silently roll two phases into one. If a phase is trivial
(one-line change), say so and collapse the chain.

## 1. SPECIFY — what & why, never how

Write the spec in the user's language. Capture:
- **Goal**: one sentence, the user-visible outcome.
- **Actors & flows**: who does what, main path + notable alternates.
- **Acceptance criteria**: testable, numbered. "Given X, when Y, then Z."
- **Out of scope**: what you're deliberately not doing.
- **`[NEEDS-CLARIFICATION: …]`**: mark every guess instead of resolving it silently.

No tech choices here. No class names, no endpoints, no DB. If you're tempted to write "how", it belongs in PLAN.

If a spec already exists (a PRD, a ticket): don't rewrite it. Read it, extract goal + acceptance criteria + open questions, and jump to CLARIFY.

## 2. CLARIFY

List the `[NEEDS-CLARIFICATION]` items as concrete questions. Prefer offering the likely answer as a default ("assuming X unless you say otherwise"). Resolve all of them before planning.

## 3. PLAN — how

Now the technical shape. Match the codebase's existing patterns — read them first.
- **Architecture**: which modules/layers, which existing patterns to reuse.
- **Contracts**: API endpoints (verbs, codes, DTOs), events, schema/migrations.
- **Risks & tradeoffs**: name them, pick one, say why.
- **Test strategy**: what proves each acceptance criterion.

## 4. TASKS

Decompose PLAN into an ordered list. Each task:
- Independently implementable and **independently verifiable** (has its own check).
- Small enough to review in one sitting.
- States its dependency (`after T3`) and its done-condition (`test: …`).

Order by dependency, not by convenience.

## 5. IMPLEMENT

One task at a time. Write the check first (or alongside), make it pass, stop. Surgical diffs — every changed line traces to the current task.

## 6. VERIFY

Exercise the feature end-to-end against the acceptance criteria. Map each numbered criterion to a passing observation. Anything unmet goes back to the relevant phase.

## Artifacts on disk

For a non-trivial feature:

```
specs/<feature-slug>/
  spec.md      # phase 1–2
  plan.md      # phase 3
  tasks.md     # phase 4 (checklist, tick as you go)
```

For a small feature, keep them inline in the conversation.
