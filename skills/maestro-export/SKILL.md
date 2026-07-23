---
name: maestro-export
description: Convert an approved maestro plan to a standardized Markdown work ticket for implementation. Use when the maestro composer stage is complete and a work ticket needs to be exported to ~/.config/symphony/work_tickets/.
compatibility: opencode
---

## Purpose

Convert an approved maestro plan (JSON) into a clean, standardized Markdown work ticket suitable for the **Performance** (implementation) stage.
The output is a self-contained `.md` file that can be copy-pasted into Linear, Jira, or GitHub Issues, and is read by the `plan-implementation-procedure` ("pip it") skill to drive the implementer↔reviewer orchestration loop.

## Workflow

1. Read the approved maestro plan JSON from `$MAESTRO_PLANS_DIR/{plan-id}.json`.
   Refuse to export a draft plan — the plan must have `state: "approved"`.
2. Convert each module to its markdown section following the rules below.
3. Ensure `~/.config/symphony/work_tickets/` exists (`mkdir -p ~/.config/symphony/work_tickets`).
4. Write the markdown to `~/.config/symphony/work_tickets/{plan-id}.md`.

Done when: the file exists at `~/.config/symphony/work_tickets/{plan-id}.md` with all implementation-relevant sections and no excluded content (discussion, messages, non-execution modules).

## Output Sections

Only include **implementation-relevant** sections.
Exclude: discussion threads, messages, planning process artifacts, and any module content that does not bear on implementation.

### Title + Summary

```
# {plan.title}

{plan.summary}
```

If the plan has no summary, omit the paragraph.

### Acceptance Criteria

Extract from `criteria` modules.
Render as a GFM checkbox task list:

```
## Acceptance Criteria

- [ ] First criterion
- [ ] Second criterion
```

Use the `text` field of each item.

### Implementation Steps

Extract from `steps` modules.
Render as a numbered list:

```
## Implementation Steps

1. First step
2. Second step
```

Use the `text` field of each item.
If a step has a `description` field, include it on a sub-line with indentation.

### Key Decisions

Extract from `decision` modules.
Each decision gets a subheading with the decision text, followed by the chosen alternative and rationale:

```
## Key Decisions

### Decision text here
- **Decision**: The chosen alternative
- **Rationale**: Why this alternative was chosen
- **Alternatives considered**: List the other alternatives
```

If there are no decisions, omit this section.

### Risks

Extract from `risks` modules.
Render as a bullet list with severity tags:

```
## Risks

- **High**: Risk description (impact: ...)
- **Medium**: Another risk (impact: ...)
- **Low**: Minor risk
```

Use `severity` if present, otherwise derive from context (default `Medium`).
If there are no risks, omit this section.

### Assumptions

Extract from `assumptions` modules.
Render as a bullet list:

```
## Assumptions

- First assumption
- Second assumption
```

If there are no assumptions, omit this section.

### Traceability (optional)

If the maestro plan URL is known (e.g. `http://localhost:$port/plan/{plan-id}`), include at the bottom:

```
---

*Generated from [maestro plan](http://localhost:$port/plan/{plan-id})*
```

## Transformation Rules

- **Flatten lists**: If a module type appears multiple times (e.g. two `criteria` modules), merge all items into a single section.

## Example

Input plan with title "Add dark mode toggle", a `criteria` module with 3 items, a `steps` module, a `decision` module, and a `risks` module:

```
# Add dark mode toggle

Adds a toggle in the settings panel to switch between light and dark themes, respecting the system preference by default.

## Acceptance Criteria

- [ ] Toggle is visible in the settings panel
- [ ] Switching themes applies immediately without page reload
- [ ] System preference is used as default on first visit

## Implementation Steps

1. Add CSS custom properties for light and dark themes
   Create `theme.css` with `[data-theme="dark"]` overrides
2. Add `data-theme` attribute to `<html>` element on toggle
3. Persist preference in `localStorage`
4. Detect system preference via `prefers-color-scheme` media query as fallback default

## Key Decisions

### Theme persistence strategy
- **Decision**: Use `localStorage` for persistence
- **Rationale**: Simple, synchronous, no backend dependency
- **Alternatives considered**: Cookie-based (sent on every request, bloats headers), server-side user preference (overkill for presentational concern)

## Risks

- **Low**: FOUC (flash of unstyled content) on page load — mitigate by applying theme class in `<head>` before paint
- **Medium**: Third-party components may not respect CSS custom properties — may need per-component overrides

---

*Generated from [maestro plan](http://localhost:8080/plan/add-dark-mode)*
```
