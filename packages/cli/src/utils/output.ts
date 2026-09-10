import type {
  Experience,
  ExperienceSearchResult,
  GoodAiConfig,
} from "@thinkinteltech/core";
import type { InstallReport } from "../installer.js";

export interface OutputWriter {
  emit(message: string): void;
}

export interface DoctorResult {
  ready: boolean;
  databasePath: string;
  configPath: string;
  migrations: number;
  experiences: number;
  mcp: string;
}

export function printInstallReport(
  report: InstallReport,
  output: OutputWriter,
): void {
  const lines = [
    "Good-AI",
    "Your AI should remember what works.",
    "",
    "Local storage",
    `✓ Good-AI home: ${report.homeDir}`,
    `✓ Local database: ${report.databasePath}`,
    "",
    "Skills",
  ];

  if (report.skills.length === 0) {
    lines.push("○ No supported client skill locations detected.");
  } else {
    for (const skill of report.skills) {
      lines.push(
        skill.installed
          ? `✓ ${skill.name}: skill ready (${skill.path})`
          : `⚠ ${skill.name}: ${skill.reason ?? "skill not installed"}`,
      );
    }
  }

  lines.push("", "MCP integrations");
  for (const client of report.clients) {
    if (!client.detected) {
      lines.push(`○ ${client.name}: not detected`);
    } else if (client.registered) {
      lines.push(`✓ ${client.name}: MCP registered`);
    } else if (client.reason?.startsWith("Existing")) {
      lines.push(`✓ ${client.name}: ${client.reason}`);
    } else {
      lines.push(`⚠ ${client.name}: ${client.reason ?? "not registered"}`);
    }
  }

  lines.push(
    "",
    report.ready ? "Good-AI is ready." : "Good-AI needs attention.",
    "",
    "Run `good-ai doctor` to verify.",
  );
  output.emit(lines.join("\n"));
}

export function printDoctorResult(
  result: DoctorResult,
  output: OutputWriter,
): void {
  const marker = result.ready && result.mcp === "ready" ? "✓" : "⚠";
  output.emit(
    [
      "Good-AI doctor",
      "",
      `${marker} ${
        result.ready
          ? "Local storage is ready."
          : "Local storage needs attention."
      }`,
      `  Database: ${result.databasePath}`,
      `  Config: ${result.configPath}`,
      `  Migrations: ${result.migrations}`,
      `  Experiences: ${result.experiences}`,
      `${result.mcp === "ready" ? "✓" : "⚠"} MCP server: ${result.mcp}`,
    ].join("\n"),
  );
}

export function printExperiences(
  experiences: Experience[],
  output: OutputWriter,
  heading = "Experiences",
): void {
  if (experiences.length === 0) {
    output.emit("○ No experiences found.");
    return;
  }

  output.emit(
    [
      `${heading} (${experiences.length})`,
      "",
      ...experiences.map(
        (experience) =>
          `✓ ${experience.task.title}\n  ${experience.id} · ${experience.task.category}`,
      ),
    ].join("\n"),
  );
}

export function printSearchResults(
  results: ExperienceSearchResult[],
  query: string,
  output: OutputWriter,
): void {
  if (results.length === 0) {
    output.emit(`○ No experiences matched “${query}”.`);
    return;
  }

  output.emit(
    [
      `Search results for “${query}” (${results.length})`,
      "",
      ...results.map(
        (result) =>
          `✓ ${result.title}\n  ${result.id} · ${result.category} · ${result.tags.join(", ") || "untagged"}`,
      ),
    ].join("\n"),
  );
}

export function printExperience(
  experience: Experience,
  output: OutputWriter,
): void {
  const lines = [
    experience.task.title,
    "",
    `ID: ${experience.id}`,
    `Category: ${experience.task.category}`,
    `Intent: ${experience.task.intent}`,
    `Tags: ${experience.task.tags.join(", ") || "none"}`,
    `Environment: ${experience.environment.client} (${experience.environment.model})`,
    "",
    "Approach",
    indent(experience.recipe.approach),
    "",
    "Instructions",
    formatList(experience.recipe.instructions),
    "",
    "Constraints",
    formatList(experience.recipe.constraints),
    "",
    "Context",
    formatList(experience.recipe.context),
    "",
    "Tools",
    experience.recipe.tools.length === 0
      ? "  None"
      : experience.recipe.tools
          .map((tool) => `  • ${tool.name}: ${tool.purpose}`)
          .join("\n"),
    "",
    "Success evidence",
    `  Confidence: ${Math.round(experience.success.confidence * 100)}%`,
    ...experience.success.signals.map(
      (signal) => `  ✓ ${signal.type}: ${signal.summary}`,
    ),
    `  Reproduced: ${experience.success.reproduction.successes}/${experience.success.reproduction.attempts} successful`,
  ];

  output.emit(lines.join("\n"));
}

export function printDeletedExperience(id: string, output: OutputWriter): void {
  output.emit(`✓ Deleted experience ${id}.`);
}

export function printConfig(
  config: GoodAiConfig & {
    paths: { homeDir: string; configPath: string; databasePath: string };
  },
  output: OutputWriter,
): void {
  output.emit(
    [
      "Good-AI configuration",
      "",
      `✓ Version: ${config.version}`,
      `✓ Storage: ${config.storage.provider}`,
      `  Database: ${config.storage.path}`,
      "",
      "Paths",
      `  Home: ${config.paths.homeDir}`,
      `  Config: ${config.paths.configPath}`,
      `  Database: ${config.paths.databasePath}`,
    ].join("\n"),
  );
}

function formatList(values: string[]): string {
  return values.length === 0
    ? "  None"
    : values.map((value) => `  • ${value}`).join("\n");
}

function indent(value: string): string {
  return value
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}
