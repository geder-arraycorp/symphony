---
name: create-bash-script
description: Creates bash scripts following a standard pattern with a well-defined HELP_MESSAGE and a flag-parsing while loop using case statements. Use when creating, writing, or scaffolding bash scripts, shell scripts, or .sh files. Always apply this pattern when the user asks for a new bash script.
---

# Creating Bash Scripts

Always structure bash scripts with:
1. `SCRIPT_DIR` resolution at the top
2. A `HELP_MESSAGE` variable with full usage docs
3. Default variable declarations
4. A `while [[ "$#" -gt 0 ]]; do` flag-parsing loop
5. Required argument validation after parsing
6. The script logic last

For scripts with subcommands, see the **Subcommand Layout** section below.

## Template

```bash
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

HELP_MESSAGE="Usage: script-name.sh -x/--required-flag <value> [-o/--optional <value>] [-h/--help]

  One-line description of what the script does.

  -x, --required-flag   Description of required flag
  -o, --optional        Description of optional flag (default: somevalue)
  -h, --help            Show this help message"

required_flag=""
optional="somevalue"

while [[ "$#" -gt 0 ]]; do
  case $1 in
    -x|--required-flag)
      required_flag=$2
      shift 2
      ;;

    -o|--optional)
      optional=$2
      shift 2
      ;;

    -h|--help)
      echo "$HELP_MESSAGE"
      exit 0
      ;;

    *)
      echo "Unknown parameter passed: $1"
      echo "$HELP_MESSAGE"
      exit 1
      ;;
  esac
done

if [[ -z "$required_flag" ]]; then
  echo "Error: --required-flag is required"
  echo "$HELP_MESSAGE"
  exit 1
fi

# script logic here
```

## Rules

- **`HELP_MESSAGE`**: Always a variable (not a function), printed via `echo "$HELP_MESSAGE"`. Include short (`-x`) and long (`--example`) forms for every flag, and mark which are required vs optional with defaults.
- **Flag loop**: Always use `while [[ "$#" -gt 0 ]]; do` with a `case` statement. Use `shift 2` for flags that take a value, `shift` alone for boolean flags. Always include a `*)` catch-all that prints the help and exits 1.
- **`-h|--help`**: Always present. Prints `$HELP_MESSAGE` and exits 0.
- **Validation block**: After the loop, check all required variables are non-empty with `[[ -z "$var" ]]`. Print an error + `$HELP_MESSAGE` and exit 1 on failure.
- **`SCRIPT_DIR`**: Always include at the top. Use it to call sibling scripts as `"$SCRIPT_DIR/other-script.sh"`.
- **Exit codes**: `exit 0` for success/help, `exit 1` for errors. Propagate failures with `|| exit 1` or `|| { echo "Error: ..."; exit 1; }`.
- Boolean/toggle flags use `shift` (not `shift 2`) and set a variable to `true`.

## Boolean Flag Example

```bash
-v|--verbose)
  verbose=true
  shift
  ;;
```

## Calling Sibling Scripts

```bash
"$SCRIPT_DIR/other-script.sh" -a "$arg1" -b "$arg2" || exit 1
```

---

## Subcommand Layout

When a script exposes two or more subcommands (e.g. `myscript.sh list ...`, `myscript.sh deploy ...`), split it into a **dispatcher** and a **`<script_name>_cmds/`** directory of standalone subcommand scripts.

### File structure

```text
some-dir/
  myscript.sh                   # dispatcher (thin entry point)
  myscript_cmds/
    list.sh                     # subcommand — standalone script
    deploy.sh                   # subcommand — standalone script
```

- Directory is named `<script_name>_cmds` (snake_case, `_cmds` suffix) next to the dispatcher.
- One `.sh` file per subcommand, named after the subcommand.
- Each subcommand script follows the standard single-script template (SCRIPT_DIR, HELP_MESSAGE, while-loop, validation, logic).
- The subcommand script filename may be more descriptive than the subcommand name when it dispatches further (e.g. `publish` -> `publish_image.sh`). Leaf scripts that do one thing should match the subcommand name (e.g. `push` -> `push.sh`).

### Dispatcher template

The dispatcher only contains `SCRIPT_DIR`, a top-level `HELP_MESSAGE` listing available commands, and a `case` block that `exec`s into the matching subcommand script.

```bash
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

HELP_MESSAGE="Usage: myscript.sh <command> [options]

  One-line description.

  Commands:
    list      Short description of list
    deploy    Short description of deploy

  Run 'myscript.sh <command> -h' for command-specific help."

case "${1:-}" in
  list)   shift; exec "$SCRIPT_DIR/myscript_cmds/list.sh" "$@" ;;
  deploy) shift; exec "$SCRIPT_DIR/myscript_cmds/deploy.sh" "$@" ;;
  -h|--help) echo "$HELP_MESSAGE" ;;
  "")     echo "$HELP_MESSAGE"; exit 1 ;;
  *)      echo "Unknown command: $1"; echo "$HELP_MESSAGE"; exit 1 ;;
esac
```

### Subcommand script template

Each subcommand file is a full standalone script. Its `HELP_MESSAGE` usage line includes the parent script name for clarity (e.g. `Usage: myscript.sh list ...`).

```bash
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

HELP_MESSAGE="Usage: myscript.sh list [-r/--repo <prefix>] [-h/--help]

  One-line description of this subcommand.

  -r, --repo   Description of flag
  -h, --help   Show this help message"

repo=""

while [[ "$#" -gt 0 ]]; do
  case $1 in
    -r|--repo)
      repo=$2
      shift 2
      ;;

    -h|--help)
      echo "$HELP_MESSAGE"
      exit 0
      ;;

    *)
      echo "Unknown parameter passed: $1"
      echo "$HELP_MESSAGE"
      exit 1
      ;;
  esac
done

# validation and logic here
```

### Nested dispatchers

A subcommand can itself be a dispatcher when it groups related operations. The nested dispatcher lives inside the parent's `_cmds/` directory and has its own `_cmds/` directory beside it.

```text
azure/registry/
  acr_worker.sh                          # top-level dispatcher
  acr_worker_cmds/
    publish_image.sh                     # nested dispatcher (subcommand: publish)
    publish_image_cmds/
      push.sh                            # leaf subcommand
      promote.sh                         # leaf subcommand
    display_images.sh                    # nested dispatcher (subcommand: display)
    display_images_cmds/
      list.sh                            # leaf subcommand
      latest.sh                          # leaf subcommand
    modify_image.sh                      # nested dispatcher (subcommand: modify)
    modify_image_cmds/
      rename.sh                          # leaf subcommand
```

The top-level dispatcher `exec`s into the nested dispatcher, which `exec`s into the leaf:

```bash
# acr_worker.sh (top-level)
case "${1:-}" in
  publish) shift; exec "$SCRIPT_DIR/acr_worker_cmds/publish_image.sh" "$@" ;;
  display) shift; exec "$SCRIPT_DIR/acr_worker_cmds/display_images.sh" "$@" ;;
  modify)  shift; exec "$SCRIPT_DIR/acr_worker_cmds/modify_image.sh" "$@" ;;
  ...
esac

# acr_worker_cmds/publish_image.sh (nested dispatcher)
case "${1:-}" in
  push)    shift; exec "$SCRIPT_DIR/publish_image_cmds/push.sh" "$@" ;;
  promote) shift; exec "$SCRIPT_DIR/publish_image_cmds/promote.sh" "$@" ;;
  ...
esac
```

Leaf scripts carry the **full invocation chain** in their `HELP_MESSAGE`:

```bash
# acr_worker_cmds/publish_image_cmds/push.sh
HELP_MESSAGE="Usage: acr_worker.sh publish push -i/--image <local-image> -r/--repo <path> [-h/--help]
  ..."
```

Each nested dispatcher's `HELP_MESSAGE` also carries the chain up to its level:

```bash
# acr_worker_cmds/publish_image.sh
HELP_MESSAGE="Usage: acr_worker.sh publish <command> [options]
  ..."
```

### Subcommand rules

- **`exec` dispatch**: The dispatcher uses `exec` (not sourcing or calling) so the subcommand replaces the dispatcher process. This keeps exit codes clean and avoids nested shells.
- **Self-contained**: Each subcommand script defines its own constants/variables. Do not rely on exported env vars from the dispatcher. Duplicating a few constants across subcommand files is acceptable to keep them independently runnable.
- **`HELP_MESSAGE` prefix**: Each subcommand's usage line starts with the **full invocation chain** from the top-level script (`Usage: acr_worker.sh publish push ...`) so the user sees exactly how to call it.
- **Standard pattern inside**: Every subcommand script follows the same single-script rules (SCRIPT_DIR, HELP_MESSAGE var, while-loop, `-h|--help`, `*)` catch-all, validation block, exit codes).
- **`chmod +x`**: Make every subcommand script executable.
- **Naming**: Choose subcommand names that avoid stuttering with parent names (e.g. use `display` instead of `list` when the nested subcommand is also called `list`, giving `acr_worker.sh display list` instead of `acr_worker.sh list list`).

### When to use subcommands vs. a single script

- **Single script**: One purpose, one set of flags.
- **Subcommands**: The script serves multiple distinct operations that share a namespace but have different flag sets. If you find yourself writing `cmd_foo()` / `cmd_bar()` functions dispatched by a case block inside a single file, extract them into subcommand scripts instead.
- **Nested dispatchers**: Use when a group of related operations is large enough to warrant its own sub-grouping (e.g. `publish` groups `push` and `promote`).

### Migrating an existing script to subcommands

1. Create the `<script_name>_cmds/` directory next to the script.
2. For each `cmd_*` function (or case branch with inline logic), create a standalone `.sh` file in the new directory. Convert `return` to `exit`, `local` declarations to top-level variables, and add `SCRIPT_DIR` / `HELP_MESSAGE` / while-loop boilerplate.
3. Replace the original script body with the dispatcher template, using `exec` to call each subcommand.
4. `chmod +x` all new scripts.
5. Verify existing wrapper scripts or aliases still work (they call the dispatcher, which now `exec`s the subcommand).

