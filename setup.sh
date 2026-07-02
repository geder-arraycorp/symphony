#!/bin/bash
# Symphony repo setup — symlinks contents into ~/.config/maki/
# Run once on each device after cloning. Safe to re-run.
#
# Usage: ./setup.sh [--dry-run]

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
fi

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/maki"
SYMPHONY_DIR="$(cd "$(dirname "$0")" && pwd)"

if $DRY_RUN; then
    echo "[DRY RUN] Would link from: $SYMPHONY_DIR"
    echo "[DRY RUN] Would link into: $CONFIG_DIR"
    echo ""
fi

link() {
    local src="$1"
    local dst="$2"

    if [ ! -e "$src" ] && [ ! -L "$src" ]; then
        return  # source doesn't exist, skip
    fi

    if $DRY_RUN; then
        echo "[DRY RUN] ln -sfn $src -> $dst"
        return
    fi

    # Create parent dir if needed
    mkdir -p "$(dirname "$dst")"

    # Remove existing file/symlink (but not a directory we don't own)
    if [ -L "$dst" ] || [ -f "$dst" ]; then
        rm -f "$dst"
    fi

    ln -sfn "$src" "$dst"
    echo "  linked $(basename "$dst")"
}

echo "=== Symphony Setup ==="
echo "  Repo: $SYMPHONY_DIR"
echo "  Target: $CONFIG_DIR"
echo ""

# --- AGENTS.md ---
link "$SYMPHONY_DIR/AGENTS.md" "$CONFIG_DIR/AGENTS.md"

# --- Skills (individual subdirectories) ---
if [ -d "$SYMPHONY_DIR/skills" ]; then
    for skill_dir in "$SYMPHONY_DIR/skills"/*/; do
        [ -d "$skill_dir" ] || continue
        name="$(basename "$skill_dir")"
        link "$skill_dir" "$CONFIG_DIR/skills/$name"
    done
fi

# --- Commands (individual files) ---
if [ -d "$SYMPHONY_DIR/commands" ]; then
    for cmd_file in "$SYMPHONY_DIR/commands"/*; do
        [ -f "$cmd_file" ] || continue
        link "$cmd_file" "$CONFIG_DIR/commands/$(basename "$cmd_file")"
    done
fi

# --- Providers (individual scripts) ---
if [ -d "$SYMPHONY_DIR/providers" ]; then
    for prov_file in "$SYMPHONY_DIR/providers"/*; do
        [ -f "$prov_file" ] || continue
        link "$prov_file" "$CONFIG_DIR/providers/$(basename "$prov_file")"
    done
fi

# --- init.lua ---
link "$SYMPHONY_DIR/init.lua" "$CONFIG_DIR/init.lua"

echo ""
echo "Done. Run 'maki' to verify."
