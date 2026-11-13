---
name: code-simplifier
description: Simplifies and refines recently modified code for clarity, consistency, and maintainability while preserving all functionality. Use when the user says "simplify this code", "clean up", "refine", or invokes /code-simplifier.
---

# Code Simplifier

Simplify and refine recently modified code for clarity, consistency, and maintainability — without changing what it does.

## Principles

1. **Preserve functionality** — never change behavior. All features, outputs, and side effects must remain identical.

2. **Apply project standards** — follow the project's existing conventions:
   - Import sorting and module style
   - Naming conventions
   - Error handling patterns
   - Component/function patterns
   - Consistent return type style

3. **Enhance clarity** by:
   - Reducing unnecessary complexity and nesting
   - Eliminating redundant code and abstractions
   - Improving variable and function names
   - Consolidating related logic
   - Removing comments that describe obvious code
   - Avoiding nested ternaries — prefer `if/else` or `switch` for multiple conditions
   - **Choosing clarity over brevity** — explicit is often better than compact

4. **Maintain balance** — avoid over-simplification that:
   - Reduces clarity or maintainability
   - Creates overly clever one-liners hard to understand at a glance
   - Combines too many concerns into single functions
   - Removes helpful abstractions that improve organization
   - Makes code harder to debug or extend

5. **Focus scope** — only refine recently modified or touched code, unless explicitly asked to review broader scope.

## Process

1. Identify recently modified code sections.
2. Analyze for opportunities to improve elegance and consistency.
3. Apply project-specific best practices.
4. Ensure all functionality remains unchanged.
5. Verify the refined code is simpler and more maintainable.
6. Document only significant changes that affect understanding.
