import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createExperience, openDatabase } from "../src/index.js";
import {
  removeExperienceSearch,
  searchExperiences,
  toFtsMatchQuery,
  upsertExperienceSearch,
} from "../src/search/experience-search.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createSearchFixture() {
  const userHome = mkdtempSync(join(tmpdir(), "good-ai-search-test-"));
  temporaryDirectories.push(userHome);
  const storage = openDatabase({ userHome });
  const experience = createExperience(
    {
      task: {
        title: "Improve premium UI without changing layout",
        category: "frontend-design",
        intent: "visual_refinement",
        tags: ["ui", "design"],
      },
      recipe: {
        approach: "Preserve the layout while improving visual hierarchy.",
        instructions: ["Improve spacing", "Improve typography"],
        constraints: ["Do not rewrite the interface"],
        context: ["The existing layout is already usable."],
        tools: [{ name: "browser", purpose: "Inspect the rendered UI" }],
      },
      environment: { client: "codex" },
      success: {
        confidence: 0.95,
        signals: [
          {
            type: "explicit_positive_feedback",
            summary: "The user approved the polished result.",
          },
        ],
      },
    },
    { id: "exp_search-1" },
  );

  return { storage, experience };
}

describe("experience search", () => {
  it("indexes searchable fields and returns lightweight summaries", () => {
    const { storage, experience } = createSearchFixture();
    upsertExperienceSearch(storage.sqlite, experience);

    expect(searchExperiences(storage.sqlite, "premium layout", 5)).toEqual([
      expect.objectContaining({
        id: "exp_search-1",
        title: "Improve premium UI without changing layout",
        category: "frontend-design",
        tags: ["ui", "design"],
      }),
    ]);
    expect(
      searchExperiences(storage.sqlite, "browser typography"),
    ).toHaveLength(1);
    storage.sqlite.close();
  });

  it("replaces and removes index entries", () => {
    const { storage, experience } = createSearchFixture();
    upsertExperienceSearch(storage.sqlite, experience);

    const updated = {
      ...experience,
      task: { ...experience.task, title: "A completely different task" },
    };
    upsertExperienceSearch(storage.sqlite, updated);
    expect(searchExperiences(storage.sqlite, "premium")).toHaveLength(0);
    expect(
      searchExperiences(storage.sqlite, "completely different"),
    ).toHaveLength(1);

    removeExperienceSearch(storage.sqlite, experience.id);
    expect(
      searchExperiences(storage.sqlite, "completely different"),
    ).toHaveLength(0);
    storage.sqlite.close();
  });

  it("handles empty, punctuated, and bounded queries", () => {
    const { storage, experience } = createSearchFixture();
    upsertExperienceSearch(storage.sqlite, experience);

    expect(searchExperiences(storage.sqlite, "")).toEqual([]);
    expect(toFtsMatchQuery("premium: layout!")).toBe('"premium" OR "layout"');
    expect(() => searchExperiences(storage.sqlite, "premium", 0)).toThrow(
      "positive integer",
    );
    storage.sqlite.close();
  });
});
