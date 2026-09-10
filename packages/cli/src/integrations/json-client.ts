import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ClientAdapter, ClientInstallResult } from "./types.js";

export interface JsonClientAdapterOptions {
  configKey?: string;
  serverName?: string;
  serverConfig?: (command: string) => Record<string, unknown>;
  isDetected?: (userHome: string, cwd: string, configPath: string) => boolean;
}

export function createJsonClientAdapter(
  name: string,
  configPath: (userHome: string, cwd: string) => string,
  options: JsonClientAdapterOptions = {},
): ClientAdapter {
  return {
    name,
    configPath,
    isDetected: (userHome, cwd, path) =>
      options.isDetected?.(userHome, cwd, path) ?? existsSync(path),
    install: (path, command) => installJsonClient(name, path, command, options),
  };
}

function installJsonClient(
  name: string,
  configPath: string,
  command: string,
  options: JsonClientAdapterOptions,
): ClientInstallResult {
  const configKey = options.configKey ?? "mcpServers";
  const serverName = options.serverName ?? "good-ai";

  try {
    mkdirSync(dirname(configPath), { recursive: true });
    const parsed = existsSync(configPath)
      ? (JSON.parse(readFileSync(configPath, "utf8")) as Record<
          string,
          unknown
        >)
      : {};
    const existingServers = parsed[configKey];
    if (existingServers !== undefined && !isObject(existingServers)) {
      return {
        name,
        configPath,
        detected: true,
        registered: false,
        reason: `Skipped because ${configKey} is not a JSON object.`,
      };
    }

    const mcpServers = (existingServers ?? {}) as Record<string, unknown>;
    if (mcpServers[serverName] !== undefined) {
      return {
        name,
        configPath,
        detected: true,
        registered: false,
        reason: "Existing good-ai configuration preserved.",
      };
    }

    mcpServers[serverName] = options.serverConfig?.(command) ?? {
      command,
      args: ["mcp"],
    };
    parsed[configKey] = mcpServers;
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
