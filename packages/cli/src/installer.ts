import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closeStorage, openDatabase } from "@good-ai/core";

interface ClientDefinition {
  name: string;
  configPath: (userHome: string, cwd: string) => string;
  format: "json" | "toml";
}

export interface ClientInstallResult {
  name: string;
  configPath: string;
  detected: boolean;
  registered: boolean;
  reason?: string;
}

export interface InstallReport {
  ready: boolean;
  homeDir: string;
  configPath: string;
  databasePath: string;
  skillPath: string;
  skillInstalled: boolean;
  clients: ClientInstallResult[];
}

export interface InstallOptions {
  userHome?: string;
  cwd?: string;
  command?: string;
  skillSourcePath?: string;
}

const clientDefinitions: ClientDefinition[] = [
  {
    name: "Claude Code",
    configPath: (userHome) => join(userHome, ".claude.json"),
    format: "json",
  },
  {
    name: "Cursor",
    configPath: (userHome) => join(userHome, ".cursor", "mcp.json"),
    format: "json",
  },
  {
    name: "Windsurf",
    configPath: (userHome) =>
      join(userHome, ".codeium", "windsurf", "mcp_config.json"),
    format: "json",
  },
  {
    name: "VS Code",
    configPath: (_userHome, cwd) => join(cwd, ".vscode", "mcp.json"),
    format: "json",
  },
  {
    name: "Codex",
    configPath: (userHome) => join(userHome, ".codex", "config.toml"),
    format: "toml",
  },
];

export function installGoodAi(options: InstallOptions = {}): InstallReport {
  const userHome = options.userHome ?? homedir();
  const cwd = options.cwd ?? process.cwd();
  const storage = openDatabase({ userHome });
  const skillPath = join(storage.paths.homeDir, "GOOD_AI.md");
  const skillSourcePath = options.skillSourcePath ?? findSkillSource();
  let skillInstalled = false;

  try {
    skillInstalled = installSkill(skillSourcePath, skillPath);
    const clients = clientDefinitions.map((client) =>
      installClient(client, userHome, cwd, options.command ?? "good-ai"),
    );

    return {
      ready: true,
      homeDir: storage.paths.homeDir,
      configPath: storage.paths.configPath,
      databasePath: storage.paths.databasePath,
      skillPath,
      skillInstalled,
      clients,
    };
  } finally {
    closeStorage(storage);
  }
}

function findSkillSource(): string {
  const packaged = fileURLToPath(
    new URL("../assets/GOOD_AI.md", import.meta.url),
  );
  if (existsSync(packaged)) {
    return packaged;
  }

  return fileURLToPath(new URL("../../skill/GOOD_AI.md", import.meta.url));
}

function installSkill(sourcePath: string, destinationPath: string): boolean {
  mkdirSync(dirname(destinationPath), { recursive: true });
  if (existsSync(destinationPath)) {
    return (
      readFileSync(destinationPath, "utf8") === readFileSync(sourcePath, "utf8")
    );
  }

  copyFileSync(sourcePath, destinationPath);
  return true;
}

function installClient(
  client: ClientDefinition,
  userHome: string,
  cwd: string,
  command: string,
): ClientInstallResult {
  const configPath = client.configPath(userHome, cwd);
  if (!existsSync(configPath)) {
    return {
      name: client.name,
      configPath,
      detected: false,
      registered: false,
    };
  }

  if (client.format === "toml") {
    return {
      name: client.name,
      configPath,
      detected: true,
      registered: false,
      reason: "Detected, but automatic TOML registration is not enabled.",
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Record<
      string,
      unknown
    >;
    const existingServers = parsed.mcpServers;
    if (existingServers !== undefined && !isObject(existingServers)) {
      return {
        name: client.name,
        configPath,
        detected: true,
        registered: false,
        reason: "Skipped because mcpServers is not a JSON object.",
      };
    }

    const mcpServers = (existingServers ?? {}) as Record<string, unknown>;
    if (mcpServers["good-ai"] !== undefined) {
      return {
        name: client.name,
        configPath,
        detected: true,
        registered: false,
        reason: "Existing good-ai configuration preserved.",
      };
    }

    mcpServers["good-ai"] = { command, args: ["mcp"] };
    parsed.mcpServers = mcpServers;
    writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    return { name: client.name, configPath, detected: true, registered: true };
  } catch {
    return {
      name: client.name,
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
