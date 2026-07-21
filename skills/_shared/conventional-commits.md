# Conventional Commits

Shared reference for skills that commit. Not a skill — no `SKILL.md`, not invocable. Pointed at by `publish-it` and `plan-implementation-procedure`.

## Format

```
<type>(<scope>): <description>
```

`scope` is optional; omit the parentheses when there is no clear scope.

## Types

- `feat`: a new feature
- `fix`: a bug fix
- `docs`: documentation only changes
- `style`: changes that do not affect the meaning of the code (whitespace, formatting)
- `refactor`: a code change that neither fixes a bug nor adds a feature
- `test`: adding missing tests or correcting existing tests
- `chore`: changes to the build process or auxiliary tools and libraries

The same set prefixes branch names: `<type>/<scope>-<short-description>`.

## Examples

```
feat(auth): add user login functionality
fix(api): resolve timeout issue in user endpoint
docs(readme): update installation instructions
refactor(db): optimize query performance
test(auth): add unit tests for login flow
```
