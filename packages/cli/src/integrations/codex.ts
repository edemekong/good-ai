import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ClientAdapter, ClientInstallResult } from "./types.js";

const serverSection = "[mcp_servers.good_ai]";

export function createCodexClientAdapter(): ClientAdapter {
  return {
    name: "Codex",
    configPath: (userHome) => join(userHome, ".codex", "config.toml"),
    isDetected: (_userHome, _cwd, configPath) =>
      existsSync(dirname(configPath)) || existsSync(configPath),
    install: (configPath, command) => installCodexClient(configPath, command),
  };
}

function installCodexClient(
  configPath: string,
  command: string,
): ClientInstallResult {
  const name = "Codex";
  mkdirSync(dirname(configPath), { recursive: true });

  const existing = existsSync(configPath)
    ? readFileSync(configPath, "utf8")
    : "";
  if (hasGoodAiServer(existing)) {
    return {
      name,
      configPath,
      detected: true,
      registered: false,
      reason: "Existing good-ai configuration preserved.",
    };
  }

  if (hasInlineMcpServers(existing)) {
    return {
      name,
      configPath,
      detected: true,
      registered: false,
      reason:
        "Skipped because inline mcp_servers configuration cannot be safely merged.",
    };
  }

  const entry = [
    serverSection,
    `command = ${JSON.stringify(command)}`,
    'args = ["mcp"]',
  ].join("\n");
  const separator =
    existing.length === 0 ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
  writeFileSync(configPath, `${existing}${separator}${entry}\n`, "utf8");

  return { name, configPath, detected: true, registered: true };
}

function hasGoodAiServer(config: string): boolean {
  return (
    new RegExp(`^${escapeRegExp(serverSection)}\\s*$`, "mu").test(config) ||
    /^\s*mcp_servers\.good_ai(?:\.|\s*=)/mu.test(config)
  );
}

function hasInlineMcpServers(config: string): boolean {
  return /^\s*mcp_servers\s*=/mu.test(config);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
