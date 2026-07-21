---
name: grilling-wizard
description: Run a wizard-style configuration interview inside Maestro using the grilling skill. Ask one decision question at a time as a questions-module item, then generate and render the plan in the same Maestro session. Use when the user wants to be grilled about a topic, plan, or decision and see the result rendered in Maestro.
compatibility: opencode
---

## Purpose

This skill runs the **grilling** skill's relentless one-at-a-time interview **inside Maestro**, then generates the resulting plan and renders it in the same Maestro session.
The grilling skill supplies the questioning behavior — one question at a time, with a recommended answer, walking the decision tree.
This skill supplies the Maestro orchestration — the server, the listen loop, and the grilling-to-plan handoff.

The result is a wizard-style configuration flow.
The plan page starts as a single `questions` module with one unanswered decision, grows by one item per round, and transforms into a full plan (criteria, steps, risks, etc.) once shared understanding is reached.

## Prerequisites

- `maestro` on PATH (run `./setup` from the repo root if not).
- `$MAESTRO_PLANS_DIR` set (the `setup` script exports it).
- The **grilling** skill loaded (it provides the questioning behavior).
- The **maestro** skill loaded (it provides the server and feedback-loop mechanics).
- A topic to grill on.
  If the user did not name one, ask a single question to get it before starting.

## Workflow

### Phase 1 — Setup

1. Discover a running server or start one (reuse, do not duplicate):
   ```bash
   port=$(skills/maestro/scripts/maestro-discover.sh --port 8080 --max-port 8089 2>/dev/null || echo "")
   if [ -z "$port" ]; then
     port=8080
     maestro &
     while ! curl -s "http://localhost:$port/api/plans" >/dev/null 2>&1; do sleep 0.2; done
     started_server=true
   else
     started_server=false
   fi
   ```
2. Pick a plan-id from the topic, e.g. `grilling-<slug>`.
3. Write `plans/<plan-id>.toon` using the initial template below (one `questions` module, one unanswered item).
4. If you reused a server, force a rescan and confirm:
   ```bash
   curl -s -X POST "http://localhost:$port/api/admin/reload"
   curl -s "http://localhost:$port/api/plan/<plan-id>" | jq -r .title
   ```
   If the title is empty, the server's plans dir differs — start a fresh server on a free port.
5. Open the plan and tell the user:
   ```bash
   open "http://localhost:$port/plan/<plan-id>"
   ```
   > The plan is ready at http://localhost:$port/plan/<plan-id>.
   > Answer each question by clicking the current unanswered item and commenting on it.
   > I'll ask one question at a time until we reach a shared understanding, then generate the plan here.

### Phase 2 — Grilling loop (form-style, one at a time)

Start the heartbeat and initialize `last_seen_msg_ids` from the plan's current messages:

```bash
skills/maestro/scripts/maestro-heartbeat.sh --plan-name "<plan-id>" --port "$port" --interval 15
```

Then loop:

1. Wait for the user's answer:
   ```bash
   plan_json=$(skills/maestro/scripts/maestro-listen.sh --plan-name "<plan-id>" --port "$port" --timeout 7200)
   ```
2. Parse `$plan_json`.
   For each new `role: human` message whose `id` is not in `last_seen_msg_ids`:
   - If `item_ref` points to the current unanswered question item, treat `text` as the answer to that question.
   - If there is no `item_ref`, treat `text` as meta — `skip`, `done`, or `revise <n>` — and act accordingly.
3. Update the `.toon`: flip the answered item to `answered: true` and set `answer` to the user's decision (or `Accepted recommendation: <rec>` if accepted).
4. Before the next question, explore the environment for facts (filesystem, tools, docs).
   Per the grilling skill, do not ask what you can look up.
5. Walk the decision tree, resolving dependencies one by one.
   Add **exactly one** new unanswered item with the next question and the recommended answer embedded in `text`:
   ```
   <question>? Recommended: <rec> - <reason>.
   ```
   Never add more than one unanswered item per round — that is what makes it a wizard.
6. When the decision tree is resolved, add a final confirmation item:
   ```
   Have we reached a shared understanding? Recommended: Yes - proceed to plan generation.
   ```
7. When the confirmation item is answered `Yes`, exit the grilling loop and go to Phase 3.
8. Add every processed message id to `last_seen_msg_ids` so you do not reprocess it.

### Phase 3 — Generate plan

1. Synthesize the answered decisions into plan modules: `criteria`, `steps`, `risks`, `assumptions`, `changes`, `notes`.
2. Append those modules to the **same** `.toon`.
   Keep the `questions` module as the decision log.
3. Leave `state: draft` so the user can review.
4. Post an agent message:
   ```bash
   curl -s -X POST "http://localhost:$port/api/plan/<plan-id>/messages" \
     -H "Content-Type: application/json" \
     -d '{"role":"agent","text":"Shared understanding reached. I have generated the plan below from our decisions. Please review and approve."}'
   ```

### Phase 4 — Review loop

Hand off to the maestro skill's feedback session workflow (steps 3-6): listen for item comments and general feedback, respond, and update the `.toon` when feedback implies plan changes.

### Phase 5 — On approval

When `plan.state == "approved"`:

1. Set the agent offline:
   ```bash
   curl -s -X POST "http://localhost:$port/api/agent/<plan-id>/status" \
     -H "Content-Type: application/json" -d '{"status":"offline"}'
   ```
2. Post a final acknowledgment.
3. Stop the heartbeat:
   ```bash
   skills/maestro/scripts/maestro-heartbeat.sh --plan-name "<plan-id>" --port "$port" --stop
   ```
4. Stop the server only if `started_server=true` (never kill a reused server).
5. Proceed with implementation using the **plan-implementation-procedure** skill.

## Initial .toon template

```
title: <topic> - Configuration Wizard
summary: Grilling session to reach a shared understanding before generating the plan.
state: draft

modules[1]:
  - type: questions
    heading: Configuration Decisions
    items[1]:
      - text: <Q1>? Recommended: <rec> - <reason>.
        answered: false
```

The `questions` module only has `text`, `answered`, and `answer` fields, so the recommendation lives in `text`.
On answer, set `answered: true` and `answer: <decision>`.
After confirmation, append the generated `criteria`/`steps`/`risks`/`assumptions`/`changes`/`notes` modules to the same file.

The Maestro server re-encodes `.toon` files into canonical tabular form on write.
Empty `answer` and false `answered` fields are dropped on re-encode, so a freshly written unanswered item may render as text-only until you set `answered: true`.
Always set `answered: true` with a non-empty `answer` for resolved items so the state survives re-encoding.

## Edge cases

- **User revises an earlier answer**: flip that item back to `answered: false`, re-ask any dependent items, and continue.
- **User signals done early**: honor it — generate the plan from the decisions collected so far.
- **User goes idle 30 min**: ask whether they are still reviewing.
- **Server plans-dir mismatch**: start a fresh server on a free port per the maestro skill.
- **No topic given**: ask one question to get the topic before Phase 1.
- **General sidebar message (no item_ref)**: treat as meta, not as an answer to the current question.

## Loop summary

```
1. Setup: discover/start server, write initial .toon (one unanswered question), open browser, tell user.
2. last_seen_msg_ids = current message ids.
3. Loop:
   a. plan_json = maestro-listen.sh (blocks until the .toon changes).
   b. For each new human message:
      - item_ref matches current unanswered item -> record answer, mark item answered.
      - no item_ref -> meta (skip / done / revise).
      - add msg id to last_seen_msg_ids.
   c. Explore env for facts; determine next decision from the tree.
   d. If tree resolved -> add confirmation item; on Yes -> Phase 3.
      Else -> add exactly one new unanswered question item.
4. Phase 3: generate plan modules, append to same .toon, post agent message, state stays draft.
5. Phase 4-5: standard maestro review loop; on approval -> offline, stop heartbeat, plan-implementation-procedure.
```
