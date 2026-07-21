---
name: plan-implementation-procedure
description: Execute the plan implementation workflow when user says 'pip it' or similar phrases. Detects the repo's default branch — creates a new branch if on default, skips branch creation if already on a feature branch. Writes tests, makes conventional commits, and opens a draft PR upon completion.
compatibility: opencode
---

## Purpose
When users say "pip it" or request to implement a plan, you **MUST** use this skill to execute the standard workflow: create a branch, implement code, write tests, make conventional commits, and open a draft PR when complete.

## Example Triggers
- pip it
- pip this
- implement the plan
- execute the plan

## Workflow

### 0. Check Current Branch
Before creating a branch, determine the current branch and the repo's default branch:

```bash
DEFAULT_BRANCH=$(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null | sed 's|origin/||')
DEFAULT_BRANCH=${DEFAULT_BRANCH:-main}
CURRENT_BRANCH=$(git branch --show-current)
```

- `git rev-parse --abbrev-ref origin/HEAD` reads the local `origin/HEAD` ref (set on `git clone`, no network call)
- The fallback `${DEFAULT_BRANCH:-main}` handles repos where `origin/HEAD` is not set (fresh `git init`)

### 1. Branch Creation (Conditional)
When starting implementation of a plan:

1. Compare `$CURRENT_BRANCH` against `$DEFAULT_BRANCH`:
   - **If on `$DEFAULT_BRANCH`**: create a new branch with a descriptive name based on the plan/feature
   - **If on any other branch**: **skip branch creation** — you're already on a feature/fix branch (`$CURRENT_BRANCH`). Continue with implementation directly.

2. Set a variable for use in later steps:

```bash
if [ "$CURRENT_BRANCH" = "$DEFAULT_BRANCH" ]; then
  # Create a new branch
  BRANCH_NAME="<branch-name>"  # Replace with kebab-case name based on the plan
  git checkout -b "$BRANCH_NAME"
else
  # Stay on current branch
  BRANCH_NAME="$CURRENT_BRANCH"
  echo "Already on branch '$BRANCH_NAME'. Skipping branch creation."
fi
```

- Use kebab-case naming convention for new branches
- Branch name should reflect the feature or fix being implemented
- Example: `feature/add-user-authentication`, `fix/login-timeout-issue`, `refactor/database-queries`

### 2. Initial Implementation
After implementing the plan:
1. Stage and commit the implementation code using **Conventional Commits** specification

```bash
git add .
git commit -m "<type>(<scope>): <description>"
```

### 3. Writing Tests
Before creating the draft PR, write comprehensive tests:

1. **Create test files** in `__tests__/` following the project's existing directory structure
2. **Test the workflow** (the full flow through layers):
   - For API changes: test the complete request→auth→validation→db→response pipeline
   - For component changes: render the component with testing-library and test user interactions
   - For service changes: test the full service method with mocked dependencies
3. **Add unit tests** where appropriate for individual functions, validators, or edge cases
4. **Follow existing patterns** in the codebase:
   - API route tests: mock `@/lib/database/db`, `@/lib/services/validators/adminAuthUtils`, `@/lib/services/audit/auditLogger`
   - Component tests: use `/** @jest-environment jsdom */`, `@testing-library/react`, `screen`
   - Pure logic: direct imports, no mocking needed
5. **Verify nothing is broken**: run `npm test` before proceeding

When tests pass, commit them:

```bash
git add .
git commit -m "test(<scope>): add tests for <feature>"
```

### 4. Draft Pull Request
After implementation and tests are committed:
1. Push the branch to remote
2. Create a **draft pull request** immediately
3. Include a comprehensive description:
   - Summary of changes
   - Reference to the original plan
   - Test results and instructions
   - Any notes or considerations

```bash
git push -u origin "$BRANCH_NAME"
gh pr create --draft --title "<type>(<scope>): <description>" --body "$(cat <<'EOF'
## Summary
<Brief summary of changes>

## Plan Reference
<Link or reference to the original plan>

## Changes Made
- <List of key changes>

## Tests
<Test results and how to verify>

## Notes
<Any additional notes>
EOF
)"
```

### 5. Iterative Changes
When the user requests changes after the draft PR is created:
1. Make the requested changes (update implementation and/or tests as needed)
2. Commit using **Conventional Commits** specification
3. Push to the existing branch (updates the draft PR automatically)

```bash
git add .
git commit -m "<type>(<scope>): <description>"
git push
```

If tests need updating alongside code changes, commit them together or use the `test` type for standalone test changes. Run `npm test` after changes to ensure nothing is broken.

### 6. Conventional Commits Format

Use the [Conventional Commits](../_shared/conventional-commits.md) specification for all commit messages — format, types, and examples live there.

## Important Notes
- Write tests during step 3 **before** creating the draft PR, not after
- The draft PR serves as a work-in-progress for review and feedback
- All subsequent changes are committed and pushed to update the existing draft PR
- Follow the repository's PR template if one exists
