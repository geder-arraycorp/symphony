# Glossary — Maestro Module Types

The catalog of typed modules a Maestro plan is built from. Each entry shows the module's purpose, its fields, and a worked example in both **tabular tuple form** (compact) and **list form** (readable) — the two shapes every module accepts. This is the disclosed reference for [`maestro`](SKILL.md); when authoring a module, reach for the type whose example matches what you want to express.

All module types share one required field — **text**, the primary description — written as the first column of a tuple or as `- text: …` in list form. Field names in **bold** below recur across types. A field omitted from a tuple row is left empty (e.g. `,false,` for an unanswered question's missing answer). For the full plan shape these modules sit inside, see `examples/demo.toon` (tabular) and `examples/regression-suite.toon` (list).

## criteria

Acceptance criteria — the checkbox list the plan must satisfy to be done. One criterion per item, phrased as a checkable outcome ("All existing data is preserved", not "handle data"). The plan is approved against these; make them exhaustive so nothing slips past approval.

Fields: `text`.

Tabular tuple form:

```toon
- heading: Acceptance Criteria
  items[2]{text}:
    All existing data is preserved after migration
    Read replicas sync within 5 seconds of primary
  type: criteria
```

List form:

```toon
- type: criteria
  heading: Acceptance Criteria
  items[2]:
    - text: All existing data is preserved after migration
    - text: Read replicas sync within 5 seconds of primary
```

_Avoid_: requirements, goals, exit criteria

## steps

Implementation steps — the numbered, owned, tracked list of work. Each step ends on an implicit completion criterion; pair **status** with an **owner** so responsibility is visible. **status** is one of `pending`, `in-progress`, `done`, `blocked`.

Fields: `text`, `owner`, `status`.

Tabular tuple form:

```toon
- heading: Implementation Steps
  items[3]{owner,status,text}:
    infra-team,done,"Provision PostgreSQL 15 instance in staging"
    app-team,in-progress,"Run schema compatibility checks on all databases"
    both,blocked,"Switch write traffic during maintenance window"
  type: steps
```

List form:

```toon
- type: steps
  heading: Implementation Steps
  items[3]:
    - text: Provision PostgreSQL 15 instance in staging
      owner: infra-team
      status: done
    - text: Run schema compatibility checks on all databases
      owner: app-team
      status: in-progress
    - text: Switch write traffic during maintenance window
      owner: both
      status: blocked
```

_Avoid_: tasks, actions, todo

## risks

Risk items — each a threat with its **severity**, **impact**, and **mitigation**. **severity** is `high`, `medium`, or `low`. Put the threat in `text`; the consequence in `impact`; the action in `mitigation`.

Fields: `text`, `severity`, `impact`, `mitigation`.

Tabular tuple form:

```toon
- heading: Risks
  items[2]{impact,mitigation,severity,text}:
    "Services unable to connect to new database","Use a DNS alias so the connection string remains unchanged",medium,"Application connection strings need updates across all services"
    "Some advanced features may be temporarily unavailable","Verify all extensions are compatible with PG15 ahead of time",low,"Minor PostgreSQL extension version mismatch"
  type: risks
```

List form:

```toon
- type: risks
  heading: Risks
  items[2]:
    - text: Application connection strings need updates across all services
      severity: medium
      impact: Services unable to connect to new database
      mitigation: Use a DNS alias so the connection string remains unchanged
    - text: Minor PostgreSQL extension version mismatch
      severity: low
      impact: Some advanced features may be temporarily unavailable
      mitigation: Verify all extensions are compatible with PG15 ahead of time
```

_Avoid_: issues, concerns, threats

## decision

Decisions — each a fork-in-the-road that was resolved, recorded with the alternatives considered and the rationale for the winner.
Put the chosen decision in `text`; the rejected alternatives in **options**; the reasoning in **rationale**.
Use for the output of a grilling session or any plan whose primary content is decisions rather than steps.
`criteria` and `risks` belong in their own sibling modules — `decision` does not duplicate them.

Fields: `text`, `options`, `rationale`.

Tabular tuple form:

```toon
- heading: Key Decisions
  items[2]{options,rationale,text}:
    "library Y — too heavy; library Z — unmaintained","X wins on speed and maintenance; Y's feature set is not needed here","Use library X for the search layer"
    "build in-house; buy SaaS","build cost is justified by tight latency requirements and existing team expertise","Build the indexing pipeline in-house"
  type: decision
```

List form:

```toon
- type: decision
  heading: Key Decisions
  items[2]:
    - text: Use library X for the search layer
      options: "library Y — too heavy; library Z — unmaintained"
      rationale: "X wins on speed and maintenance; Y's feature set is not needed here"
    - text: Build the indexing pipeline in-house
      options: "build in-house; buy SaaS"
      rationale: "build cost is justified by tight latency requirements and existing team expertise"
```

_Avoid_: conclusions, verdicts (use `notes` for those)

## assumptions

Assumptions being made — the premises the plan rests on, named so they can be challenged. One assumption per item; if one proves false, promote it to a **risk** or a **question**.

Fields: `text`.

Tabular tuple form:

```toon
- heading: Assumptions
  items[2]{text}:
    "Application uses connection pooling via PgBouncer"
    "Network latency between old and new instances is under 1ms"
  type: assumptions
```

List form:

```toon
- type: assumptions
  heading: Assumptions
  items[2]:
    - text: Application uses connection pooling via PgBouncer
    - text: Network latency between old and new instances is under 1ms
```

_Avoid_: premises, givens, prerequisites

## changes

Files or resources that change — the footprint of the plan. `text` is the path or resource; **type** tags its kind (`terraform`, `config`, `docs`, …). Use for things the plan touches, not for concepts.

Fields: `text`, `type`.

Tabular tuple form:

```toon
- heading: Changes Required
  items[3]{text,type}:
    infra/terraform/database.tf,terraform
    config/deploy.yml,config
    docs/runbooks/migration.md,docs
  type: changes
```

List form:

```toon
- type: changes
  heading: Changes Required
  items[3]:
    - text: infra/terraform/database.tf
      type: terraform
    - text: config/deploy.yml
      type: config
    - text: docs/runbooks/migration.md
      type: docs
```

_Avoid_: files, artifacts, deliverables

## notes

Freeform notes — anything that does not fit a typed list. The catch-all; reach for it last, after the typed modules have absorbed what they can. Keep prose here, not actions — actionable work belongs in **steps**.

Fields: `text`.

Tabular tuple form:

```toon
- heading: Notes
  items[2]{text}:
    "Coordinate with DevOps to schedule the maintenance window. Suggested: Saturday 02:00–04:00 UTC."
    "Run the migration script with --dry-run first to verify all steps."
  type: notes
```

List form:

```toon
- type: notes
  heading: Notes
  items[2]:
    - text: Coordinate with DevOps to schedule the maintenance window. Suggested: Saturday 02:00–04:00 UTC.
    - text: Run the migration script with --dry-run first to verify all steps.
```

_Avoid_: comments, remarks, misc

## questions

Open questions — each an unresolved decision with an **answered** flag and, when answered, an **answer**. `answered` is `true` or `false`; leave `answer` empty when `answered: false` (the empty first column in the tuple). When a question resolves, flip `answered` to `true` and fill `answer`.

Fields: `text`, `answered`, `answer`.

Tabular tuple form:

```toon
- heading: Open Questions
  items[3]{answer,answered,text}:
    "Yes — keep for 30 days at reduced cost.",true,"Should we keep the old PG12 instance running for 30 days as a fallback?"
    "Maximum 5 seconds lag before we abort the cutover.",true,"What is the acceptable replication lag threshold for cutover?"
    ,false,"Do we need to update any monitoring dashboards or alerts?"
  type: questions
```

List form:

```toon
- type: questions
  heading: Open Questions
  items[3]:
    - text: Should we keep the old PG12 instance running for 30 days as a fallback?
      answered: true
      answer: "Yes — keep for 30 days at reduced cost."
    - text: What is the acceptable replication lag threshold for cutover?
      answered: true
      answer: "Maximum 5 seconds lag before we abort the cutover."
    - text: Do we need to update any monitoring dashboards or alerts?
      answered: false
```

_Avoid_: unknowns, todos
