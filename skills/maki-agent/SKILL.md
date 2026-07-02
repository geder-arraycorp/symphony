---
name: maki-agent
description: Reference for using the Maki coding agent — config, skills, rules, commands, providers, and project setup.
compatibility: opencode
---

## Purpose

This skill explains how to use the Maki coding agent effectively. It covers where configuration files, skills, rules, and agent instructions live, what formats they expect, and how to customize the agent's behavior.

## Directory Layout

Maki uses XDG directories (config checked first, `~/.maki/` as legacy fallback):

| Purpose | Path |
| ------- | ---- |
| Config  | `~/.config/maki/` (init.lua, permissions.toml, mcp.toml, skills/, providers/, commands/) |
| Data    | `~/.local/share/maki/` (sessions, auth, plans, memories) |
| Logs    | `~/.local/logs/maki/` |
| State   | `~/.local/state/maki/` (model tiers, input history, preferences) |

Run `maki migrate xdg` to move from the old `~/.maki/` layout to XDG.

## Configuration

Settings go in `init.lua`, a Lua script that calls `maki.setup()`.

**Two locations, both optional:**

- **Global**: `~/.config/maki/init.lua`
- **Project**: `.maki/init.lua` (relative to working directory — overrides global)

### Example

```lua
maki.setup({
    ui = {
        splash_animation = true,
        mouse_scroll_lines = 5,
    },
    agent = {
        bash_timeout_secs = 180,
        max_output_lines = 3000,
    },
    provider = {
        default_model = "anthropic/claude-sonnet-4-6",
    },
    tools = {
        bash = { enabled = true },
    },
})
```

`maki.setup()` can only be called once. All fields are optional. Typos in field names cause an error immediately.

### Key Config Sections

- **`ui`**: Splash animation, scrollbar, typewriter speed, mouse scroll lines, tool output truncation per tool
- **`agent`**: Timeouts (`bash_timeout_secs`, `code_execution_timeout_secs`), output limits (`max_output_lines`, `max_output_bytes`, `max_line_bytes`), compaction buffer, search result limit, continuation turns, interpreter memory limit
- **`provider`**: `default_model`, connect/stream/low-speed timeouts
- **`storage`**: Max log size/files, input history size
- **`index`**: Max file size for indexing
- **`tools`**: Enable/disable tools (bash, websearch, webfetch, etc.)
- **Top-level**: `always_yolo`, `always_fast`, `always_thinking`

## Skills

Skills provide reusable instructions that an agent loads on demand via the `skill()` tool.

### Location

```
~/.config/maki/skills/<skill-name>/SKILL.md
```

### Format

Each skill is a Markdown file with YAML frontmatter and a body of instructions:

```markdown
---
name: <skill-name>
description: Short description of what the skill does.
compatibility: opencode
---

## Purpose

...

## Content
...
```

The frontmatter fields:
- **`name`**: The skill name used with the `skill()` tool (kebab-case).
- **`description`**: Brief description shown in the available skills list.
- **`compatibility`**: Set to `opencode` (the only supported value).

When loaded via `skill("<name>")`, the entire file content is injected into the agent's system prompt.

### Available Skills

Use the `skill()` tool to list or load skills. The tool returns a list of available skills with their names and descriptions.

## Rules / Personal Instructions

Instructions for the agent are loaded from these files (in order, all added to the system prompt):

| File | Location | Scope | Gitignored? |
| ---- | -------- | ----- | ----------- |
| `AGENTS.md` | Project root | Per-project conventions | No |
| `AGENTS.local.md` | Project root | Personal per-project overrides | Yes |
| `AGENTS.md` | `~/.config/maki/` | Global instructions for all projects | N/A (user config) |

`AGENTS.md` is loaded at the start of every session. Put coding conventions, repo quirks, off-limits directories, and project-specific setup instructions here.

### Other Recognized Instruction Files

Maki also recognizes these instruction files (first match wins):

- `CLAUDE.md`
- `COPILOT.md`
- `.cursorrules`
- `CONVENTIONS.md`
- `GEMINI.md`

### Subdirectory Instructions

Maki automatically loads instruction files inside subdirectories when performing a `read` operation in that subdirectory, providing context-aware guidance.

## Project Configuration Directory: `.maki/`

Place a `.maki/` directory in your project root for per-project settings:

```
.maki/
├── init.lua           # Overrides global config (Lua, calls maki.setup())
├── permissions.toml   # Permission allow/deny rules
├── mcp.toml           # MCP server configuration (stdio or HTTP)
└── commands/          # Custom slash commands (.md files)
```

### Permissions (`permissions.toml`)

Define allow/deny rules for tools like `bash`:

```toml
[bash]
allow = [
    "git *",
    "ls *",
    "which *",
]
deny = [
    "rm -rf *",
]
```

Rules can be global (`~/.config/maki/permissions.toml`) or per-project (`.maki/permissions.toml`).

### MCP Servers (`mcp.toml`)

Configure external tool servers:

```toml
[[server]]
name = "my-server"
transport = "stdio"
command = "npx"
args = ["-y", "@modelcontextprotocol/server"]

[[server]]
name = "web-api"
transport = "http"
url = "https://api.example.com/mcp"
```

MCP configs can be global (`~/.config/maki/mcp.toml`) or per-project (`.maki/mcp.toml`).

## Custom Commands

Define slash commands as Markdown files.

- **Project commands**: `.maki/commands/<name>.md` — listed as `/project:<name>`
- **User commands**: `~/.config/maki/commands/<name>.md` — listed as `/user:<name>`
- **Legacy**: `.claude/commands/` directories also supported

### Format

```markdown
---
description: Review code for issues
argument-hint: <file>
---

Review $ARGUMENTS and suggest improvements.
```

- `$ARGUMENTS` in the body gets replaced with whatever follows the command name
- Optional frontmatter: `name`, `description`, `argument-hint`

## Providers

### Environment Variables

Set at least one API key to use Maki:

| Provider   | Env Var |
| ---------- | ------- |
| Anthropic  | `ANTHROPIC_API_KEY` |
| OpenAI     | `OPENAI_API_KEY` |
| Google     | `GEMINI_API_KEY` |
| GitHub Copilot | `GH_COPILOT_TOKEN` |
| Ollama     | `OLLAMA_HOST` (default `http://localhost:11434`) |
| Mistral    | `MISTRAL_API_KEY` |
| Z.AI       | `ZHIPU_API_KEY` |
| DeepSeek   | `DEEPSEEK_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Synthetic  | `SYNTHETIC_API_KEY` |
| TensorX    | `TENSORX_API_KEY` |
| LlamaCpp   | `LLAMA_CPP_HOST` (default `http://localhost:8080`) |

Multiple API keys can be set as comma-separated — they rotate automatically on rate-limit or auth errors.

### Model Identifiers

Format: `provider/model_id` (e.g., `anthropic/claude-sonnet-4-6`, `openai/gpt-4.1`, `zai/glm-4.7`). If the model name is unique across providers, the prefix can be omitted.

### Model Tiers

Models are split into three tiers: **weak** (cheap/fast), **medium** (balanced), **strong** (highest capability). There is also a **compaction** tier for summarization. Assign models via the `/model` command palette (press `!`, `@`, `#`, or `$`). Overrides are saved to `~/.local/state/maki/model-tiers`.

### Dynamic Providers

Drop an executable script into `~/.config/maki/providers/` to add a custom provider or proxy. The script must handle subcommands: `info`, `models` (optional), `resolve`, `login`, `logout`, `refresh`.

## Built-in Commands

Type `/` in the input box to open the command palette:

| Command | Description |
| ------- | ----------- |
| `/tasks` | Browse and search tasks |
| `/compact` | Summarize and compact conversation |
| `/new` | Start a new session |
| `/help` | Show keybindings |
| `/queue` | Remove items from queue |
| `/sessions` | Browse and switch sessions |
| `/model` | Switch model |
| `/theme` | Switch color theme |
| `/mcp` | Configure MCP servers |
| `/login` | Authenticate with an LLM provider |
| `/cd` | Change working directory |
| `/btw` | Ask a quick question (no tools, no history) |
| `/yolo` | Toggle YOLO mode (skip permissions) |
| `/thinking` | Toggle extended thinking |
| `/fast` | Toggle Anthropic fast mode (Opus only) |
| `/exit` | Exit the application |
| `/memory` | View, edit, and delete memory files |

## Keybindings

| Binding | Action |
| ------- | ------ |
| `Enter` | Send prompt |
| `\`+`Enter` / `Ctrl+J` / `Alt+Enter` | Newline in input |
| `Ctrl+U` / `Ctrl+D` | Scroll half page up/down |
| `Esc` `Esc` | Cancel streaming (during) / Rewind (when idle) |
| `Ctrl+C` | Quit |
| `Ctrl+H` | Show all keybindings |

## Headless Mode

Run non-interactively for scripts and CI:

```bash
maki --print "Refactor this function to use async/await"
```

Compatible with Claude Code output format.

## Tools Reference

Maki has 17 built-in tools:

| Tool | Description |
| ---- | ----------- |
| `task` | Launch sub-agents (research or general) |
| `batch` | Execute multiple tool calls in parallel |
| `code_execution` | Run Python in a sandboxed interpreter |
| `bash` | Execute bash commands |
| `edit` | Replace exact string match in a file |
| `multiedit` | Multiple find-and-replace edits atomically |
| `glob` | Find files by glob pattern |
| `grep` | Search file contents with regex |
| `index` | Compact file overview (tree-sitter) |
| `read` | Read a file or directory |
| `write` | Write content to a file |
| `websearch` | Search the web (Exa AI) |
| `webfetch` | Fetch a URL |
| `question` | Ask the user questions |
| `memory` | Persistent project-scoped scratchpad |
| `todo_write` | Create/update structured todo lists |
| `skill` | Load a skill |

## Gotchas & Best Practices

1. **`maki.setup()` can only be called once** — subsequent calls error out.
2. **Config typos are caught immediately** — unknown field names produce a `ConfigError`.
3. **Auth is re-read each time an agent spawns** — change env vars or run `maki auth login` in another terminal and the next `/new` picks it up.
4. **Multiple API keys in one env var** — comma-separate them and they rotate on errors.
5. **`AGENTS.md` is loaded at session start** — keep it concise; conventions, not commentary.
6. **Instruction files in subdirs are auto-loaded on `read`** — useful for module-level conventions.
7. **`/compact` reduces token usage** — run it when context gets long.
8. **`/btw` asks without tool access or history pollution** — use for quick factual questions.
9. **Model tiers persist across sessions** — set them once via `/model`.
10. **`permissions.toml` deny rules override YOLO mode** — even with `/yolo` on, denied commands are blocked.
