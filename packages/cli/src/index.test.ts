import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createProgram, type CliOutput } from "./index.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createOutput() {
  const lines: string[] = [];
  const output: CliOutput = { emit: (message) => lines.push(message) };
  return { lines, output };
}

describe("good-ai CLI", () => {
  it("initializes and reports local readiness", async () => {
    const home = mkdtempSync(join(tmpdir(), "good-ai-cli-test-"));
    temporaryDirectories.push(home);
    const { lines, output } = createOutput();

    await createProgram(output).parseAsync([
      "node",
      "good-ai",
      "--home",
      home,
      "--json",
      "doctor",
    ]);

    expect(JSON.parse(lines[0])).toMatchObject({
      ready: true,
      migrations: 2,
      experiences: 0,
      mcp: "ready",
    });
  });

  it("supports list, search, show, and delete over shared local storage", async () => {
    const home = mkdtempSync(join(tmpdir(), "good-ai-cli-test-"));
    temporaryDirectories.push(home);
    const { lines, output } = createOutput();
    const seed = createProgram(output);
    await seed.parseAsync(["node", "good-ai", "--home", home, "doctor"]);

    const { openDatabase, createExperienceService, closeStorage } =
      await import("@good-ai/core");
    const storage = openDatabase({ userHome: home });
    const experience = createExperienceService(storage).record({
      task: {
        title: "Improve the UI",
        category: "frontend-design",
        intent: "visual_refinement",
        tags: ["ui"],
      },
      recipe: {
        approach: "Improve hierarchy without changing layout.",
        instructions: [],
        constraints: [],
        context: [],
        tools: [],
      },
      environment: { client: "codex" },
      success: {
        confidence: 0.9,
        signals: [
          {
            type: "explicit_positive_feedback",
            summary: "The user approved the result.",
          },
        ],
      },
    });
    closeStorage(storage);

    await createProgram(output).parseAsync([
      "node",
      "good-ai",
      "--home",
      home,
      "--json",
      "show",
      experience.id,
    ]);
    expect(JSON.parse(lines.at(-1) ?? "{}").id).toBe(experience.id);

    await createProgram(output).parseAsync([
      "node",
      "good-ai",
      "--home",
      home,
      "--json",
      "search",
      "hierarchy",
    ]);
    expect(JSON.parse(lines.at(-1) ?? "")).toHaveLength(1);

    await createProgram(output).parseAsync([
      "node",
      "good-ai",
      "--home",
      home,
      "--json",
      "delete",
      experience.id,
    ]);
    expect(JSON.parse(lines.at(-1) ?? "{}")).toEqual({
      id: experience.id,
      deleted: true,
    });
  });
});
