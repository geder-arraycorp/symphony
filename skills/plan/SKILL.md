---
name: plan
description: Plan an idea to shared understanding with the user — research, clarify, present via Maestro, loop until approval plus 90%-plus confidence the plan matches the ask.
disable-model-invocation: true
compatibility: opencode
---

## Purpose

Reach **shared understanding** with the user before any code is written.
The user types `plan` to start a session; you research what you cannot ground, surface every assumption and open decision as Maestro questions, present the plan in Maestro, and stay in the feedback loop until the user approves **and** you are at least 90% confident the plan aligns with their ask.
This is the upstream entry point of the pipeline: `plan` (this skill) → approve (Maestro) → `pip it` (`plan-implementation-procedure`).

### Boundary

The `AGENTS.md` maestro rule drives the agent's **autonomous** maestro use for ad-hoc plans.
This skill is a **deliberate, human-started** session that adds the research and clarifying-questions preamble Maestro alone does not.
When the human types `plan`, run this skill; otherwise the AGENTS.md rule stands.

### Relationship to `grill-me`

`grill-me` (a personal skill) reaches understanding **conversationally**; this skill does it **structurally** — assumptions and questions live as Maestro modules the user resolves in the UI.
Complementary, not duplicative.

## Workflow

### 1. Capture the idea

Restate the user's idea as a single-sentence problem statement.
If it is not one sentence, it is not yet captured.

Done when: a one-sentence problem statement exists and the user has not corrected it.

### 2. Scope research questions

Split the idea into one or more tight, single-sentence questions a subagent could answer from primary sources.
A vague question buys vague research; **scope** is the lever that buys focus.

Done when: every question is a single sentence answerable from primary sources, or you have decided no research is needed.

### 3. Dispatch research (gated)

Use the `research` skill to dispatch one background subagent per question — but **only** for questions you cannot easily answer or ground yourself.
If you can already ground the answer from context and priors, skip research and go to step 5.
Trivial ideas need no research.

Done when: one subagent is dispatched per question that needs one (each writing to `.research/<topic>.md`), or research is explicitly skipped with a reason.

### 4. Absorb findings

When the subagents finish, read every `.research/` file they wrote.
Extract the facts and constraints that bear on the plan.

Done when: every research file has been read and the load-bearing facts are in hand.

### 5. Draft the plan with assumptions and questions

Author the Maestro `.toon` plan: `criteria`, `steps`, `risks`, `changes`, `notes` — and critically an `assumptions` module and a `questions` module.
Every premise the plan rests on goes in `assumptions`; every unresolved decision goes in `questions` with `answered: false`.
This is where **shared understanding** gets built — by naming everything uncertain so the user can confirm or correct it.

Done when: the `.toon` file has the typed modules it needs, every assumption is named, and every open decision is a question.

### 6. Publish via Maestro

Use the `maestro` skill to serve the plan: discover or start the server, write the `.toon`, open the browser, tell the user where to review, start the heartbeat, and enter the listen loop.
Do not re-implement the loop mechanics — call the `maestro` skill.

Done when: the plan is served, the browser is open, the user has been told where to review, and the listen loop is running.

### 7. Run the feedback loop

For each new human message the `maestro` listen loop returns: resolve any `item_ref` against the plan modules, respond, and update the `.toon` directly when the feedback implies a change.
When a clarifying question is answered, flip `answered: true` and fill `answer`; when an assumption is rejected, promote it to a `risk` or remove it.
The server reloads the file and broadcasts via WebSocket.

Done when: every new human message has an agent reply posted and tracked, and the `.toon` reflects every implied change.

### 8. Reach shared understanding (exit)

The loop exits only when **both** hold:

- the user has approved the plan (`state: approved`), **and**
- you are at least **90% confident** the plan aligns with what the user is asking for.

Ground that confidence in specific evidence — answered questions, confirmed assumptions, and research findings — and treat any unaddressed gap that could misalign the plan as dropping you below 90%.
If you are below 90%, do not exit: keep asking and refining.
This is **not** a hard "zero unanswered questions" gate — a question can be deferred with a stated assumption that counts as resolved — but a deferred assumption that still threatens alignment keeps you in the loop.

Done when: the plan is approved **and** you can enumerate the evidence supporting ≥90% confidence with no unaddressed misalignment gap.

### 9. Hand off

Once shared understanding is reached, set the agent offline, stop the heartbeat, post a final acknowledgment, and hand off to `plan-implementation-procedure` ("pip it") for execution.

Done when: the agent is offline, the heartbeat is stopped, the user is acknowledged, and control has passed to `plan-implementation-procedure`.

## Notes

- The pipeline is `plan` → approve (Maestro) → `pip it` (`plan-implementation-procedure`); this skill is the upstream entry point.
- DRY: this skill calls `research` and `maestro` and does not re-implement research dispatch or the feedback loop; its only original logic is the research gate, the assumptions-and-questions surfacing, and the shared-understanding exit criterion.
