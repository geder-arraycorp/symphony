---
# description and alwaysApply are Cursor-specific frontmatter keys.
# Other agent systems (Claude Code, Cline, Aider) ignore unknown frontmatter.
description: Global baseline instructions for all agent sessions
alwaysApply: true
---

# Agent Instructions
These instructions are for all scenarios across all agents.

## OpenWiki

Repositories may have documentation located in the /openwiki directory.

ALWAYS look for this and if found start here:
- [OpenWiki quickstart](openwiki/quickstart.md)

OpenWiki includes repository overview, architecture notes, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

When working in a repository with openwiki, read the OpenWiki quickstart first, then follow its links to the relevant architecture, workflow, domain, operation, and testing notes.

## General Guidelines
- When writing commit messages, never auto-add your agent name as co-author.
- Never manually modify changelog files, or any files that are auto-generated.
- When writing Markdown files, ensure every sentence is on its own line.
  Preserve normal Markdown structure, and avoid putting multiple sentences on one line.
- When planning work, do **not** implement anything.
  Only investigate, explore, and produce the plan.
  Wait for explicit approval or a prompt like "implement" to begin coding.
  During execution, perform the planned work, including any git branch, commit, push, and PR steps the plan calls for.
- When doing bug fixes, always start with reproducing the bug in an E2E setting as closely aligned with how an end user would experience it.
  This helps ensure you find the real problem so your fix solves it.
- When end-to-end testing, be picky about the UI you see and be obsessed with pixel perfection.
  If something clearly looks off, even if it is not directly related to what you are doing, try to fix it along the way.
- Apply the same high standard to engineering excellence: lint failures, test failures, and test flakiness.
  If you see one, even if it is not caused by what you are working on right now, still fix it.
- For planning discussions, stay in Agent mode by default.

## Maestro — Interactive Planning Server

When you produce any substantive plan (architecture, design, implementation, refactor, or investigation), you MUST:

1. **Format it as a Maestro plan document** — use the `maestro` skill's `.toon` format with appropriate module types (e.g., `steps` for sequential work, `risks` for trade-offs, `notes` for design rationale, `criteria` for acceptance criteria, `questions` for open decisions).
2. **Serve it via the Maestro web UI** — start the server, write the `.toon` file to `$MAESTRO_PLANS_DIR`, and open the browser URL. If `$MAESTRO_PLANS_DIR` is unset, the server defaults to `plans` relative to the current working directory; the `setup` script exports `$MAESTRO_PLANS_DIR`, so ensure it is set before writing the file.
3. **Enter the feedback loop** — enter the listening loop after the initial plan generation so the user can interact with the plan. See the `maestro` skill for the heartbeat cadence, listen endpoint, and exit conditions.

This does NOT apply to: trivial 1-3 line responses, commit messages, or inline code comments. When in doubt, use Maestro.

Direct text output of plan content is the wrong path — the listener should see it rendered in the browser with structured modules, discussion threading, and item-level commenting.
