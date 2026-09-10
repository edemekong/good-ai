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
  skillPaths: string[];
  skillInstalled: boolean;
  skills: SkillInstallResult[];
  clients: ClientInstallResult[];
}

export interface SkillInstallResult {
  name: string;
  path: string;
  installed: boolean;
  detected: boolean;
  reason?: string;
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

  try {
    const skills = installSkills(userHome, skillSourcePath);
    const clients = clientAdapters.map((client) =>
      installClient(client, userHome, cwd, options.command ?? "good-ai"),
    );

    return {
      ready: true,
      homeDir: storage.paths.homeDir,
      configPath: storage.paths.configPath,
      databasePath: storage.paths.databasePath,
      skillPath,
      skillPaths: skills.map((skill) => skill.path),
      skillInstalled: skills.some(
        (skill) => skill.path === skillPath && skill.installed,
      ),
      skills,
      clients,
    };
  } finally {
    closeStorage(storage);
  }
}

function installSkills(
  userHome: string,
  sourcePath: string,
): SkillInstallResult[] {
  const targets = [
    {
      name: "Agent Skills (Codex and VS Code)",
      path: join(userHome, ".agents", "skills", "good-ai", "SKILL.md"),
      detected: true,
    },
    {
      name: "Cursor",
      path: join(userHome, ".cursor", "skills", "good-ai", "SKILL.md"),
      detected: existsSync(join(userHome, ".cursor")),
    },
    {
      name: "Claude Code",
      path: join(userHome, ".claude", "skills", "good-ai", "SKILL.md"),
      detected:
        existsSync(join(userHome, ".claude")) ||
        existsSync(join(userHome, ".claude.json")),
    },
    {
      name: "VS Code / Copilot",
      path: join(userHome, ".copilot", "skills", "good-ai", "SKILL.md"),
      detected:
        existsSync(join(userHome, ".copilot")) ||
        existsSync(vsCodeUserProfilePath(userHome)),
    },
  ];

  return targets
    .filter((target) => target.detected)
    .map((target) => {
      const result = installSkill(sourcePath, target.path);
      return {
        name: target.name,
        path: target.path,
        installed: result.installed,
        detected: target.detected,
        ...(result.reason ? { reason: result.reason } : {}),
      };
    });
}

function vsCodeUserProfilePath(userHome: string): string {
  if (process.platform === "darwin") {
    return join(userHome, "Library", "Application Support", "Code", "User");
  }

  if (process.platform === "win32") {
    return join(userHome, "AppData", "Roaming", "Code", "User");
  }

  return join(userHome, ".config", "Code", "User");
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

function installSkill(
  sourcePath: string,
  destinationPath: string,
): { installed: boolean; reason?: string } {
  mkdirSync(dirname(destinationPath), { recursive: true });
  if (existsSync(destinationPath)) {
    if (
      readFileSync(destinationPath, "utf8") === readFileSync(sourcePath, "utf8")
    ) {
      return { installed: true };
    }

    return {
      installed: false,
      reason: "Existing skill preserved because its contents differ.",
    };
  }

  copyFileSync(sourcePath, destinationPath);
  return { installed: true };
}
