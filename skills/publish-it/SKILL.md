---
name: publish-it
description: Create a branch, commit changes, push, and open a draft PR for small fixes that don't need a planning phase. Trigger with 'publish it' or similar phrases.
compatibility: opencode
---

## Purpose
When users say "publish it" or request to publish small fixes/changes that already have uncommitted work, use this skill to create a branch, commit with conventional commits, push, and open a draft PR. This is a lighter version of the plan implementation procedure — no planning phase.

## Example Triggers
- publish it
- publish this
- push it up
- pr it
- get this on a branch

## Workflow

### 1. Assess Current State
Before doing anything, run the following to understand what's going on:
- `git branch --show-current` — determine the **current branch** (this will be the PR base)
- `git status` — check for staged/unstaged/untracked changes
- `git diff` — see unstaged changes (these are what will go in the new branch)
- `git log --oneline -5` — see recent commits for style reference

### 2. Generate Branch Name from Changes
Analyze `git diff` and `git status` to determine:
- **Type** — `fix/`, `feat/`, `chore/`, `refactor/`, `docs/`, `style/`, `test/` (based on conventional commits)
- **Scope** — the area affected (e.g., `api`, `db`, `ui`, `auth`, component name)
- **Description** — a short kebab-case summary of what changed

Generate the branch name as `<type>/<scope>-<short-description>`. If scope is unclear, use `<type>/<short-description>`.

### 3. Create Branch from Current State
Create the new branch from the current HEAD (which includes the current branch's existing commits). The current branch will serve as the PR base target.

```bash
git checkout -b <type>/<scope>-<short-description>
```

### 4. Commit Changes
Stage all relevant changes (the uncommitted work from the current branch) and commit using Conventional Commits:

```bash
git add <files>
git commit -m "<type>(<scope>): <description>"
```

**Commit Types** (from Conventional Commits):
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to build process or auxiliary tools and libraries

### 5. Push Branch

```bash
git push -u origin <type>/<scope>-<short-description>
```

### 6. Create Draft PR Against Current Branch
Create a draft pull request with the **current branch** (detected in step 1) as the base target:

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

### 7. Follow-up
If the user wants to make additional changes after the draft PR is created:
1. Make the changes
2. Commit using conventional commits
3. Push to update the draft PR

```bash
git add .
git commit -m "<type>(<scope>): <description>"
git push
```

## Important Notes
- This skill assumes changes already exist (working tree is dirty) — it does NOT include a planning/implementation phase
- Create the draft PR early — it should be a work-in-progress, not a finished product
- Branch name and commit message are derived automatically from `git diff` analysis using conventional commit conventions
