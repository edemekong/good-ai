import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createJsonClientAdapter } from "./json-client.js";
import type { ClientAdapter } from "./types.js";

export function createVsCodeClientAdapter(): ClientAdapter {
  return createJsonClientAdapter(
    "VS Code",
    (userHome) => getVsCodeMcpConfigPath(userHome),
    {
      configKey: "servers",
      serverConfig: (command) => ({
        type: "stdio",
        command,
        args: ["mcp"],
      }),
      isDetected: (userHome, _cwd, configPath) =>
        existsSync(configPath) || existsSync(dirname(configPath)),
    },
  );
}

export function getVsCodeMcpConfigPath(userHome: string): string {
  const profiles = profileNames();
  const existingProfile = profiles.find((profile) =>
    existsSync(join(userHome, ...profileParts(profile))),
  );
  const profile = existingProfile ?? profiles[0];
  return join(userHome, ...profileParts(profile), "mcp.json");
}

function profileNames(): string[] {
  return ["Code", "Code - Insiders", "VSCodium"];
}

function profileParts(profile = profileNames()[0]): string[] {
  if (process.platform === "darwin") {
    return ["Library", "Application Support", profile, "User"];
  }

  if (process.platform === "win32") {
    return ["AppData", "Roaming", profile, "User"];
  }

  return [".config", profile, "User"];
}
