import React from "react";
import { Box, Text } from "ink";
import type { McpPreset } from "../lib/mcp.js";
import type { PluginInfo } from "../lib/plugins.js";

interface McpDetailProps {
  type: "mcp";
  preset: McpPreset;
}

interface PluginDetailProps {
  type: "plugin";
  plugin: PluginInfo;
  projectOverride: boolean | undefined;
}

type Props = McpDetailProps | PluginDetailProps;

export function DetailPane(props: Props) {
  if (props.type === "mcp") {
    return <McpDetail preset={props.preset} />;
  }
  return (
    <PluginDetail
      plugin={props.plugin}
      projectOverride={props.projectOverride}
    />
  );
}

function McpDetail({ preset }: { preset: McpPreset }) {
  return (
    <Box flexDirection="column">
      <Text bold>{preset.name}</Text>
      <Text> </Text>
      <Text wrap="wrap">{preset.description}</Text>
      <Text> </Text>

      {preset.tags.length > 0 && (
        <>
          <Text dimColor>Tags: {preset.tags.join(", ")}</Text>
          <Text> </Text>
        </>
      )}

      {preset.requiredEnvVars.length > 0 && (
        <>
          <Text dimColor>Environment Variables:</Text>
          {preset.requiredEnvVars.map((v) => {
            const isSet = !!process.env[v];
            return (
              <Text key={v}>
                <Text color={isSet ? "green" : "red"}>
                  {isSet ? "  ✓ " : "  ✗ "}
                </Text>
                <Text>{v}</Text>
              </Text>
            );
          })}
        </>
      )}
    </Box>
  );
}

function PluginDetail({
  plugin,
  projectOverride,
}: {
  plugin: PluginInfo;
  projectOverride: boolean | undefined;
}) {
  const globalStatus = plugin.globalEnabled ? "ON" : "OFF";
  const projectStatus =
    projectOverride === undefined
      ? "(inherit)"
      : projectOverride
        ? "ON"
        : "OFF";

  return (
    <Box flexDirection="column">
      <Text bold>{plugin.name}</Text>
      <Text> </Text>
      <Text wrap="wrap">{plugin.description}</Text>
      <Text> </Text>
      <Text>
        <Text dimColor>Global: </Text>
        <Text color={plugin.globalEnabled ? "green" : "red"}>
          {globalStatus}
        </Text>
      </Text>
      <Text>
        <Text dimColor>Project: </Text>
        <Text>{projectStatus}</Text>
      </Text>
    </Box>
  );
}
