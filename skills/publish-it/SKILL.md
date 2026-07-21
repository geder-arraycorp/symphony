---
name: publish-it
description: Publish uncommitted working-tree changes to a draft PR when the user says 'publish it', 'push it up', 'pr it', or wants small fixes shipped without a planning pass. Use plan-implementation-procedure ('pip it') when the work needs implementing or tests; publish-it acts only on changes already in the working tree.
compatibility: opencode
---

## Workflow

### 1. Assess Current State

Run in parallel:

- `git branch --show-current` — the **current branch** (the PR base)
- `git rev-parse --abbrev-ref origin/HEAD 2>/dev/null | sed 's|origin/||'` (fallback `main`) — the **default branch**
- `git status` — staged / unstaged / untracked changes
- `git diff` — the changes that will ship

**Done when** every command has run and its output is accounted for: you know the current branch, the default branch, and the full set of changes to ship.

### 2. Generate Branch Name

From `git diff` and `git status`, derive `type`, `scope`, and a short `description` per [Conventional Commits](../_shared/conventional-commits.md).

Default branch name: `<type>/<scope>-<short-description>`. If scope is unclear, use `<type>/<short-description>`.

If a Linear issue key is in context (the user mentioned it, or it appears in the current branch, a commit, or a linked PR), follow the workspace convention instead: `<linear-issue-key>/<shortWorkDescription>` (e.g. `cops-308/fixLoginTimeout`). Do not invent a key; if none is present, use the default form.

**Done when** the branch name matches the chosen convention and reflects an actual change present in `git diff`.

### 3. Create Branch

Create the new branch from current HEAD:

```bash
git checkout -b <branch-name>
```

The PR (step 6) targets the **current branch** from step 1. State which case you are in to the user:

- Current branch is the default branch → a normal PR against default.
- Current branch is a feature branch → a **stacked PR** onto that feature branch (the new branch carries only the uncommitted changes; the feature branch's existing commits are its base, not part of this PR's diff).

**Done when** `git branch --show-current` returns the new branch.

### 4. Commit

Stage every change identified in step 1 and commit per [Conventional Commits](../_shared/conventional-commits.md):

```bash
git add <files>
git commit -m "<type>(<scope>): <description>"
```

**Done when** `git status` is clean — every change from step 1 is committed, nothing left untracked or unstaged.

### 5. Push

```bash
git push -u origin <branch-name>
```

**Done when** the branch is pushed and remote tracking is set.

### 6. Open Draft PR

Open a draft PR against the current branch from step 1:

```bash
gh pr create --draft --base <current-branch> --title "<type>(<scope>): <description>" --body "$(cat <<'EOF'
## Summary
<Brief summary of changes>

## Changes Made
- <List of key changes>

## Testing
<How to test these changes>

## Notes
<Any additional notes>
EOF
)"
```

**Done when** the draft PR is opened against `<current-branch>` and its URL is returned to the user.

### 7. Follow-up

Only when the user asks for more changes after the draft PR exists: make the changes, commit per [Conventional Commits](../_shared/conventional-commits.md), and push to update the draft PR.

```bash
git add <files>
git commit -m "<type>(<scope>): <description>"
git push
```

**Done when** the new changes are committed and pushed and the draft PR is updated.
