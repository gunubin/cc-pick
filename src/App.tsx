import React, { useState, useMemo, useEffect } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { ItemList, type ListItem } from "./components/ItemList.js";
import { DetailPane } from "./components/DetailPane.js";
import { ConfirmView } from "./components/ConfirmView.js";
import {
  loadPresets,
  loadCurrentMcp,
  writeMcpJson,
} from "./lib/mcp.js";
import {
  loadPlugins,
  loadProjectPlugins,
  getEffectiveState,
} from "./lib/plugins.js";
import { writeProjectPlugins } from "./lib/settings.js";

type Mode = "mcp" | "plugins" | "both";
type Phase = "select" | "confirm" | "done";
type ActivePane = "mcp" | "plugins";

interface Props {
  mode: Mode;
}

export function App({ mode }: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const termHeight = stdout?.rows ?? 24;

  // Load data
  const presets = useMemo(() => loadPresets(), []);
  const currentMcp = useMemo(() => loadCurrentMcp(), []);
  const allPlugins = useMemo(() => loadPlugins(), []);
  const projectPlugins = useMemo(() => loadProjectPlugins(), []);

  // State
  const [phase, setPhase] = useState<Phase>("select");
  const [activePane, setActivePane] = useState<ActivePane>(
    mode === "plugins" ? "plugins" : "mcp",
  );
  const [mcpCursor, setMcpCursor] = useState(0);
  const [pluginCursor, setPluginCursor] = useState(0);
  const [selectedMcp, setSelectedMcp] = useState(
    () => new Set(currentMcp),
  );
  const [selectedPlugins, setSelectedPlugins] = useState(
    () =>
      new Set(
        allPlugins
          .filter((p) => getEffectiveState(p, projectPlugins))
          .map((p) => p.name),
      ),
  );
  const [resultMsg, setResultMsg] = useState("");

  // Exit after done
  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(() => exit(), 800);
      return () => clearTimeout(t);
    }
  }, [phase, exit]);

  // Toggle item in current pane
  const toggleCurrent = () => {
    if (activePane === "mcp") {
      const name = presets[mcpCursor]?.name;
      if (!name) return;
      setSelectedMcp((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
      });
    } else {
      const name = allPlugins[pluginCursor]?.name;
      if (!name) return;
      setSelectedPlugins((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
      });
    }
  };

  // Input handling
  useInput((input, key) => {
    if (phase === "done") return;

    if (phase === "confirm") {
      if (input === "y" || input === "Y" || key.return) {
        let msg = "";
        if (mode !== "plugins") {
          writeMcpJson([...selectedMcp], presets);
          msg += `.mcp.json: ${selectedMcp.size} servers`;
        }
        if (mode !== "mcp") {
          writeProjectPlugins([...selectedPlugins], allPlugins);
          const overrides = allPlugins.filter(
            (p) => selectedPlugins.has(p.name) !== p.globalEnabled,
          ).length;
          if (msg) msg += "\n";
          msg += `.claude/settings.json: ${overrides} overrides`;
        }
        setResultMsg(msg);
        setPhase("done");
      } else if (input === "n" || input === "N" || key.escape) {
        setPhase("select");
      }
      return;
    }

    // Select phase
    if (input === "q") {
      exit();
      return;
    }

    if (key.tab && mode === "both") {
      setActivePane((p) => (p === "mcp" ? "plugins" : "mcp"));
      return;
    }

    const items = activePane === "mcp" ? presets : allPlugins;
    const cursor = activePane === "mcp" ? mcpCursor : pluginCursor;
    const setCursor = activePane === "mcp" ? setMcpCursor : setPluginCursor;

    if (key.upArrow || input === "k") {
      setCursor(Math.max(0, cursor - 1));
    } else if (key.downArrow || input === "j") {
      setCursor(Math.min(items.length - 1, cursor + 1));
    } else if (input === " ") {
      toggleCurrent();
    } else if (key.return) {
      setPhase("confirm");
    }
  });

  // Build list items
  const mcpItems: ListItem[] = presets.map((p) => ({
    value: p.name,
    label: p.name,
    checked: selectedMcp.has(p.name),
  }));

  const pluginItems: ListItem[] = allPlugins.map((p) => {
    const source = p.name in projectPlugins ? "P" : "G";
    const status = p.globalEnabled ? "ON" : "OFF";
    return {
      value: p.name,
      label: p.name,
      meta: `${source}:${status}`,
      checked: selectedPlugins.has(p.name),
    };
  });

  // Calculate pane heights
  const showMcp = mode !== "plugins";
  const showPlugins = mode !== "mcp";
  const paneCount = showMcp && showPlugins ? 2 : 1;
  // border top/bottom (2) + title (1) = 3 overhead per pane
  const statusBarHeight = 1;
  const availableHeight = termHeight - statusBarHeight;
  const paneOuterHeight = Math.floor(availableHeight / paneCount);
  const paneInnerHeight = paneOuterHeight - 3; // border + title

  // Focused item for detail
  const focusedPreset =
    activePane === "mcp" ? presets[mcpCursor] : undefined;
  const focusedPlugin =
    activePane === "plugins" ? allPlugins[pluginCursor] : undefined;

  // Done screen
  if (phase === "done") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="green" bold>
          ✓ Applied
        </Text>
        <Text>{resultMsg}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={termHeight}>
      <Box flexDirection="row" flexGrow={1}>
        {/* Left: selection panes */}
        <Box flexDirection="column" width="40%">
          {showMcp && (
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor={activePane === "mcp" ? "cyan" : "gray"}
              height={paneOuterHeight}
            >
              <Text
                bold
                color={activePane === "mcp" ? "cyan" : "gray"}
              >
                {" "}
                MCP Servers{" "}
              </Text>
              <ItemList
                items={mcpItems}
                cursor={mcpCursor}
                active={activePane === "mcp"}
                maxHeight={paneInnerHeight - 1}
              />
            </Box>
          )}

          {showPlugins && (
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor={activePane === "plugins" ? "cyan" : "gray"}
              height={paneOuterHeight}
            >
              <Text
                bold
                color={activePane === "plugins" ? "cyan" : "gray"}
              >
                {" "}
                Plugins{" "}
              </Text>
              <ItemList
                items={pluginItems}
                cursor={pluginCursor}
                active={activePane === "plugins"}
                maxHeight={paneInnerHeight - 1}
              />
            </Box>
          )}
        </Box>

        {/* Right: detail / confirm */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          width="60%"
          paddingX={1}
        >
          {phase === "confirm" ? (
            <ConfirmView
              mode={mode}
              selectedMcp={selectedMcp}
              currentMcp={currentMcp}
              selectedPlugins={selectedPlugins}
              plugins={allPlugins}
            />
          ) : focusedPreset ? (
            <DetailPane type="mcp" preset={focusedPreset} />
          ) : focusedPlugin ? (
            <DetailPane
              type="plugin"
              plugin={focusedPlugin}
              projectOverride={
                focusedPlugin.name in projectPlugins
                  ? projectPlugins[focusedPlugin.name]
                  : undefined
              }
            />
          ) : (
            <Text dimColor>Select an item</Text>
          )}
        </Box>
      </Box>

      {/* Status bar */}
      <Box>
        <Text dimColor>
          {phase === "confirm"
            ? " Y apply  N/Esc cancel"
            : ` ${mode === "both" ? "Tab switch  " : ""}↑↓/jk move  Space toggle  Enter apply  q quit`}
        </Text>
      </Box>
    </Box>
  );
}
