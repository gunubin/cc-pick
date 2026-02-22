# claude-setup

[![npm version](https://img.shields.io/npm/v/@gunubin/claude-setup)](https://www.npmjs.com/package/@gunubin/claude-setup)
[![license](https://img.shields.io/npm/l/@gunubin/claude-setup)](./LICENSE)

Interactive CLI for configuring Claude Code MCP servers and plugins per project.

## Install

```bash
npm install -g @gunubin/claude-setup
# or run directly
npx @gunubin/claude-setup
```

## Usage

```bash
claude-setup              # MCP + plugins
claude-setup --mcp        # MCP servers only
claude-setup --plugins    # Plugins only
claude-setup --list       # Show current config
```

## MCP Presets

Place JSON files in `~/.config/claude/mcp-presets/`. The filename (without `.json`) becomes the preset name.

```json
{
  "_meta": {
    "description": "Short description of the MCP server",
    "tags": ["tag1", "tag2"],
    "requiredEnvVars": ["API_KEY"]
  },
  "type": "stdio",
  "command": "npx",
  "args": ["some-mcp-server@latest"],
  "env": {
    "API_KEY": "${API_KEY}"
  }
}
```

- `_meta` is metadata used only by claude-setup (not written to `.mcp.json`)
- `requiredEnvVars` triggers an environment variable check in the UI
- Everything outside `_meta` is written directly to `.mcp.json`

## Key Bindings

### Selection

| Key | Action |
|-----|--------|
| `↑` / `k` | Move up |
| `↓` / `j` | Move down |
| `Space` | Toggle item |
| `Tab` | Switch pane (MCP / Plugins) |
| `Enter` | Confirm |
| `q` | Quit |

### Confirmation

| Key | Action |
|-----|--------|
| `y` / `Enter` | Apply changes |
| `n` / `Esc` | Cancel |

## Data Sources

| Data | Path |
|------|------|
| MCP presets | `~/.config/claude/mcp-presets/*.json` |
| Current MCP | `.mcp.json` |
| Installed plugins | `~/.claude/plugins/installed_plugins.json` |
| Global plugin settings | `~/.claude/settings.json` |
| Project plugin settings | `.claude/settings.json` |

## License

MIT
