import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closeStorage, openDatabase } from "@thinkinteltech/core";
import {
  clientAdapters,
  installClient,
  type ClientInstallResult,
} from "./integrations/index.js";

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

export function installGoodAi(options: InstallOptions = {}): InstallReport {
  const userHome = options.userHome ?? homedir();
  const cwd = options.cwd ?? process.cwd();
  const storage = openDatabase({ userHome });
  const skillPath = join(userHome, ".agents", "skills", "good-ai", "SKILL.md");
  const skillSourcePath = options.skillSourcePath ?? findSkillSource();
  let skillInstalled = false;

  try {
    skillInstalled = installSkill(skillSourcePath, skillPath);
    const clients = clientAdapters.map((client) =>
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
    new URL("../assets/good-ai/SKILL.md", import.meta.url),
  );
  if (existsSync(packaged)) {
    return packaged;
  }

  return fileURLToPath(
    new URL("../../skill/skills/good-ai/SKILL.md", import.meta.url),
  );
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
