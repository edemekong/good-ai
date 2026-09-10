import { join } from "node:path";
import { createCodexClientAdapter } from "./codex.js";
import { createJsonClientAdapter } from "./json-client.js";
import type { ClientAdapter, ClientInstallResult } from "./types.js";

export type { ClientAdapter, ClientInstallResult } from "./types.js";

export const clientAdapters: ClientAdapter[] = [
  createJsonClientAdapter("Claude Code", (userHome) =>
    join(userHome, ".claude.json"),
  ),
  createJsonClientAdapter("Cursor", (userHome) =>
    join(userHome, ".cursor", "mcp.json"),
  ),
  createJsonClientAdapter("Windsurf", (userHome) =>
    join(userHome, ".codeium", "windsurf", "mcp_config.json"),
  ),
  createJsonClientAdapter("VS Code", (_userHome, cwd) =>
    join(cwd, ".vscode", "mcp.json"),
  ),
  createCodexClientAdapter(),
];

export function installClient(
  client: ClientAdapter,
  userHome: string,
  cwd: string,
  command: string,
): ClientInstallResult {
  const configPath = client.configPath(userHome, cwd);
  if (!client.isDetected(userHome, cwd, configPath)) {
    return {
      name: client.name,
      configPath,
      detected: false,
      registered: false,
    };
  }

  return client.install(configPath, command);
}
