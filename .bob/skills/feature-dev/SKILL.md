---
name: feature-dev
description: Guided feature development with deep codebase understanding, clarifying questions, architecture design, and parallel agent exploration. Use when the user says "implement this feature", "build feature", "feature dev", or invokes /feature-dev with a description.
argument-hint: "[feature description]"
---

# Feature Development

Systematic feature implementation: understand the codebase deeply, ask about all underspecified details, design architecture options, then implement.

## Core principles

- **Ask clarifying questions** — identify ambiguities, edge cases, underspecified behaviors. Ask concrete questions. Wait for answers before implementing.
- **Understand before acting** — read existing code patterns first.
- **Read files identified by agents** — after agents complete, read the key files they identify before proceeding.
- **Simple and elegant** — readable, maintainable, architecturally sound code.
- **Use todo list** — track all progress throughout.

---

## Phase 1: Discovery

**Goal:** Understand what needs to be built.

Feature request: $ARGUMENTS

Actions:
1. Create todo list with all phases.
2. If the feature is unclear, ask the user:
   - What problem are they solving?
   - What should the feature do?
   - Any constraints or requirements?
3. Summarize your understanding and confirm with the user.

---

## Phase 2: Codebase Exploration

**Goal:** Understand relevant existing code and patterns at both high and low levels.

Actions:
1. Launch 2–3 code explorer agents in parallel. Each should:
   - Trace through code comprehensively, focusing on abstractions, architecture, and control flow.
   - Target a different aspect (similar features, architecture, UX, testing patterns).
   - Return a list of 5–10 key files to read.

   Example agent prompts:
   - "Find features similar to [feature] and trace their implementation comprehensively"
   - "Map the architecture and abstractions for [feature area], tracing through the code comprehensively"
   - "Identify UI patterns, testing approaches, or extension points relevant to [feature]"

2. Read all files identified by agents.
3. Present a comprehensive summary of findings and patterns.

---

## Phase 3: Clarifying Questions

**Goal:** Fill all gaps before designing. **Do not skip.**

Actions:
1. Review codebase findings and the original feature request.
2. Identify underspecified aspects: edge cases, error handling, integration points, scope, backward compatibility, performance.
3. **Present all questions to the user in a clear, organized list.**
4. **Wait for answers before proceeding.**

If the user says "whatever you think is best" — give your recommendation and get explicit confirmation.

---

## Phase 4: Architecture Design

**Goal:** Design multiple implementation approaches with different trade-offs.

Actions:
1. Launch 2–3 architect agents in parallel with different focuses:
   - **Minimal changes** — smallest change, maximum reuse of existing code.
   - **Clean architecture** — maintainability, elegant abstractions.
   - **Pragmatic balance** — speed + quality.

2. Form your own opinion on which fits best for this specific task.
3. Present to user: summary of each approach, trade-offs, **your recommendation with reasoning**, concrete implementation differences.
4. **Ask user which approach they prefer.**

---

## Phase 5: Implementation

**Goal:** Build the feature. **Do not start without user approval.**

Actions:
1. Wait for explicit user approval.
2. Read all relevant files from previous phases.
3. Implement following the chosen architecture.
4. Follow codebase conventions strictly.
5. Update todos as you progress.

---

## Phase 6: Quality Review

**Goal:** Ensure code is simple, DRY, elegant, readable, and functionally correct.

Actions:
1. Launch 3 reviewer agents in parallel:
   - Simplicity / DRY / elegance.
   - Bugs / functional correctness.
   - Project conventions / abstractions.
2. Consolidate findings and identify the highest-severity issues.
3. **Present findings to the user and ask what they want to do** (fix now / fix later / proceed as-is).
4. Address issues based on user decision.

---

## Phase 7: Summary

**Goal:** Document what was accomplished.

Actions:
1. Mark all todos complete.
2. Summarize: what was built, key decisions, files modified, suggested next steps.
