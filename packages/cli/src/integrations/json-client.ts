import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ClientAdapter, ClientInstallResult } from "./types.js";

export function createJsonClientAdapter(
  name: string,
  configPath: (userHome: string, cwd: string) => string,
): ClientAdapter {
  return {
    name,
    configPath,
    isDetected: (_userHome, _cwd, path) => existsSync(path),
    install: (path, command) => installJsonClient(name, path, command),
  };
}

function installJsonClient(
  name: string,
  configPath: string,
  command: string,
): ClientInstallResult {
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Record<
      string,
      unknown
    >;
    const existingServers = parsed.mcpServers;
    if (existingServers !== undefined && !isObject(existingServers)) {
      return {
        name,
        configPath,
        detected: true,
        registered: false,
        reason: "Skipped because mcpServers is not a JSON object.",
      };
    }

    const mcpServers = (existingServers ?? {}) as Record<string, unknown>;
    if (mcpServers["good-ai"] !== undefined) {
      return {
        name,
        configPath,
        detected: true,
        registered: false,
        reason: "Existing good-ai configuration preserved.",
      };
    }

    mcpServers["good-ai"] = { command, args: ["mcp"] };
    parsed.mcpServers = mcpServers;
    writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    return { name, configPath, detected: true, registered: true };
  } catch {
    return {
      name,
      configPath,
      detected: true,
      registered: false,
      reason:
        "Skipped because the existing JSON configuration could not be read.",
    };
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
