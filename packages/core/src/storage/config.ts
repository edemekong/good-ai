import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { z } from "zod";

export const GoodAiConfigSchema = z
  .object({
    version: z.literal(1),
    storage: z
      .object({
        provider: z.literal("sqlite"),
        path: z.string().trim().min(1),
      })
      .strict(),
  })
  .strict();

export type GoodAiConfig = z.infer<typeof GoodAiConfigSchema>;

export interface GoodAiPaths {
  homeDir: string;
  configPath: string;
  databasePath: string;
}

export function expandUserPath(filePath: string, userHome = homedir()): string {
  if (filePath === "~") {
    return userHome;
  }

  if (filePath.startsWith("~/")) {
    return join(userHome, filePath.slice(2));
  }

  return filePath;
}

export function getDefaultPaths(userHome = homedir()): GoodAiPaths {
  const homeDir = join(userHome, ".good-ai");

  return {
    homeDir,
    configPath: join(homeDir, "config.json"),
    databasePath: join(homeDir, "good-ai.db"),
  };
}

export function getDefaultConfig(paths = getDefaultPaths()): GoodAiConfig {
  return {
    version: 1,
    storage: {
      provider: "sqlite",
      path: paths.databasePath,
    },
  };
}

export function loadOrCreateConfig(
  options: {
    userHome?: string;
    configPath?: string;
    databasePath?: string;
  } = {},
): { config: GoodAiConfig; paths: GoodAiPaths } {
  const defaults = getDefaultPaths(options.userHome);
  const configPath = resolve(options.configPath ?? defaults.configPath);
  const homeDir = dirname(configPath);
  const defaultConfig = getDefaultConfig({
    ...defaults,
    homeDir,
    configPath,
    databasePath: options.databasePath
      ? resolve(expandUserPath(options.databasePath))
      : defaults.databasePath,
  });

  mkdirSync(homeDir, { recursive: true });

  let config: GoodAiConfig;
  try {
    config = GoodAiConfigSchema.parse(
      JSON.parse(readFileSync(configPath, "utf8")),
    );
  } catch (error) {
    if (isFileMissing(error)) {
      config = defaultConfig;
      writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    } else {
      throw new Error(`Unable to read Good-AI config at ${configPath}`, {
        cause: error,
      });
    }
  }

  const databasePath = resolve(expandUserPath(config.storage.path));
  return {
    config,
    paths: {
      homeDir,
      configPath,
      databasePath,
    },
  };
}

function isFileMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export function resolveStoragePath(
  storagePath: string,
  configPath: string,
): string {
  const expanded = expandUserPath(storagePath);
  return isAbsolute(expanded)
    ? expanded
    : resolve(dirname(configPath), expanded);
}
