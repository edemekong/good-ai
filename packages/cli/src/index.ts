#!/usr/bin/env node

import { Command } from "commander";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  closeStorage,
  createExperienceService,
  openDatabase,
} from "@thinkinteltech/core";
import { startGoodAiMcpServer as startMcpServer } from "@thinkinteltech/mcp";
import { installGoodAi } from "./installer.js";
import {
  printConfig,
  printDeletedExperience,
  printDoctorResult,
  printExperience,
  printExperiences,
  printInstallReport,
  printSearchResults,
} from "./utils/output.js";

export interface CliOptions {
  home?: string;
  json?: boolean;
}

export interface CliOutput {
  emit(message: string): void;
}

const consoleOutput: CliOutput = {
  emit: (message) => console.log(message),
};

export function createProgram(output: CliOutput = consoleOutput): Command {
  const program = new Command();
  program
    .name("good-ai")
    .description("A local-first memory layer for successful AI interactions.")
    .version("0.1.3")
    .option("--home <path>", "Override the Good-AI home directory")
    .option("--json", "Print machine-readable JSON where supported");

  program
    .command("install")
    .description("Initialize Good-AI and register supported local clients")
    .action(async (_options, command) => {
      const globalOptions = command.optsWithGlobals() as CliOptions;
      const report = installGoodAi({
        userHome: globalOptions.home,
        command: resolveMcpCommand(),
      });
      if (globalOptions.json) {
        printJson(report, output);
      } else {
        printInstallReport(report, output);
      }
    });

  program
    .command("doctor")
    .description("Check local Good-AI configuration and storage")
    .action(async (_options, command) => {
      const globalOptions = command.optsWithGlobals() as CliOptions;
      const result = withStorage(globalOptions, (storage) => {
        const migrationCount = (
          storage.sqlite
            .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
            .get() as { count: number }
        ).count;
        const experienceCount = (
          storage.sqlite
            .prepare("SELECT COUNT(*) AS count FROM experiences")
            .get() as { count: number }
        ).count;

        return {
          ready: migrationCount >= 2,
          databasePath: storage.paths.databasePath,
          configPath: storage.paths.configPath,
          migrations: migrationCount,
          experiences: experienceCount,
          mcp: "ready",
        };
      });
      if (globalOptions.json) {
        printJson(result, output);
      } else {
        printDoctorResult(result, output);
      }
    });

  program
    .command("list")
    .description("List stored experiences")
    .action(async (_options, command) => {
      const globalOptions = command.optsWithGlobals() as CliOptions;
      const experiences = withStorage(globalOptions, (storage) =>
        createExperienceService(storage).list(),
      );
      if (globalOptions.json) {
        printJson(experiences, output);
      } else {
        printExperiences(experiences, output);
      }
    });

  program
    .command("search <query>")
    .description("Search stored experiences")
    .option("--limit <number>", "Maximum number of results", "5")
    .action(async (query: string, options, command) => {
      const globalOptions = command.optsWithGlobals() as CliOptions;
      const limit = parseLimit(options.limit);
      const results = withStorage(globalOptions, (storage) =>
        createExperienceService(storage).search(query, limit),
      );
      if (globalOptions.json) {
        printJson(results, output);
      } else {
        printSearchResults(results, query, output);
      }
    });

  program
    .command("show <id>")
    .description("Show one stored experience")
    .action(async (id: string, _options, command) => {
      const globalOptions = command.optsWithGlobals() as CliOptions;
      const experience = withStorage(globalOptions, (storage) =>
        createExperienceService(storage).get(id),
      );
      if (globalOptions.json) {
        printJson(experience, output);
      } else {
        printExperience(experience, output);
      }
    });

  program
    .command("delete <id>")
    .description("Delete one stored experience")
    .action(async (id: string, _options, command) => {
      const globalOptions = command.optsWithGlobals() as CliOptions;
      withStorage(globalOptions, (storage) => {
        createExperienceService(storage).delete(id);
      });
      if (globalOptions.json) {
        printJson({ id, deleted: true }, output);
      } else {
        printDeletedExperience(id, output);
      }
    });

  program
    .command("config")
    .description("Show the active local configuration")
    .action(async (_options, command) => {
      const globalOptions = command.optsWithGlobals() as CliOptions;
      const config = withStorage(globalOptions, (storage) => ({
        ...storage.config,
        paths: storage.paths,
      }));
      if (globalOptions.json) {
        printJson(config, output);
      } else {
        printConfig(config, output);
      }
    });

  program
    .command("mcp")
    .description("Start the Good-AI MCP server over stdio")
    .action(async (_options, command) => {
      const globalOptions = command.optsWithGlobals() as CliOptions;
      await startMcpServer({ userHome: globalOptions.home });
    });

  return program;
}

export async function main(argv = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

function withStorage<T>(
  options: CliOptions,
  callback: (storage: ReturnType<typeof openDatabase>) => T,
): T {
  const storage = openDatabase({ userHome: options.home });
  try {
    return callback(storage);
  } finally {
    closeStorage(storage);
  }
}

function printJson(value: unknown, output: CliOutput): void {
  output.emit(JSON.stringify(value, null, 2));
}

function parseLimit(value: string): number {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Limit must be an integer from 1 to 100");
  }
  return limit;
}

export function isCliEntrypoint(
  entrypointPath: string | undefined,
  moduleUrl = import.meta.url,
): boolean {
  if (!entrypointPath) {
    return false;
  }

  try {
    return realpathSync(entrypointPath) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

export function resolveMcpCommand(entrypointPath = process.argv[1]): string {
  if (!isCliEntrypoint(entrypointPath)) {
    return "good-ai";
  }

  return realpathSync(entrypointPath);
}

if (isCliEntrypoint(process.argv[1])) {
  await main();
}

export const packageName = "@thinkinteltech/good-ai" as const;
