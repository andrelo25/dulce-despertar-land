---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults. Use when the user asks to design a page, build a UI, or wants visual design guidance.
license: Complete terms in LICENSE.txt
---

# Frontend Design

Approach this as the design lead at a small studio known for giving every client a visual identity that couldn't be mistaken for anyone else's. The client has already rejected templated proposals. Make deliberate, opinionated choices about palette, typography, and layout specific to this brief — and take one real aesthetic risk you can justify.

## Ground it in the subject

If the brief doesn't pin down the product or subject, pin it yourself first: name one concrete subject, its audience, and the page's single job. State your choice. Use any prior context about the user's preferences or what they're building. The subject's own world — its materials, instruments, artifacts, vernacular — is where distinctive choices come from.

## Design principles

**Hero as thesis.** Open with the most characteristic thing in the subject's world: a headline, image, animation, live demo, or interactive moment. A big number with a small label, supporting stats, and a gradient accent is the template answer — only use it if it's truly best.

**Typography carries personality.** Pair display and body faces deliberately, not the same families you'd reach for on any other project. Set a clear type scale with intentional weights, widths, and spacing. Make the type treatment itself memorable.

**Structure is information.** Numbering, dividers, eyebrows, and labels should encode something true about the content, not decorate it. Numbered markers (01 / 02 / 03) are only appropriate when the content is actually a sequence where order matters.

**Leverage motion deliberately.** Choose animation where it serves the subject: page-load sequences, scroll-triggered reveals, hover micro-interactions, ambient atmosphere. An orchestrated moment lands harder than scattered effects. Sometimes less is more — extra animation can make a design feel AI-generated.

**Match complexity to the vision.** Maximalist directions need elaborate execution; minimal directions need precision in spacing, type, and detail.

**Write copy with intention.** Copy can make a design feel as templated as the design itself. Write from the end user's side of the screen. Name things by what people control and recognize, never by how the system is built. Active voice, sentence case, no filler. Errors don't apologize — they explain what went wrong and how to fix it.

## Process: brainstorm → plan → critique → build → critique

**Avoid these three default clusters:**
1. Warm cream background (~#F4F1EA) + high-contrast serif + terracotta accent
2. Near-black background + single bright acid-green or vermilion accent
3. Broadsheet layout with hairline rules, zero border-radius, dense newspaper columns

These are legitimate for some briefs but are defaults, not choices. If the brief pins down a visual direction, follow it exactly. Where it leaves axes free, don't spend that freedom on defaults.

**Work in two passes:**

**Pass 1 — Design plan:**
- **Color:** 4–6 named hex values
- **Type:** Display face (used with restraint) + body face + optional utility face for captions/data
- **Layout:** One-sentence prose description + ASCII wireframe
- **Signature:** The single unique element this page will be remembered by

**Pass 2 — Self-critique before building:**
Review the plan: if any part reads as the generic default you'd produce for any similar page — revise it, say what you changed and why. Only after confirming relative uniqueness should you write the code, following the revised plan exactly.

## Restraint

Spend boldness in one place. Let the signature element be the one memorable thing, keep everything else quiet and disciplined. Cut decoration that doesn't serve the brief. Build to a quality floor without announcing it: responsive to mobile, visible keyboard focus, reduced motion respected. Before finishing, remove one accessory.

## CSS caution

Watch for CSS selector specificity conflicts — especially between type-based selectors (`.section`) and element-based ones (`.cta`). Conflicting padding/margin between sections is a common failure mode. Take a screenshot if your environment supports it to catch visual issues early.
