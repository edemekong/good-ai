import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const skill = readFileSync(new URL("../GOOD_AI.md", import.meta.url), "utf8");

describe("Good-AI skill", () => {
  it("documents the complete MCP lifecycle", () => {
    for (const tool of [
      "good_ai_search",
      "good_ai_get",
      "good_ai_record",
      "good_ai_feedback",
      "good_ai_update",
      "good_ai_delete",
    ]) {
      expect(skill).toContain(tool);
    }
  });

  it("documents contextual success detection, privacy, and trust boundaries", () => {
    expect(skill).toContain("Evaluate feedback");
    expect(skill).toContain("Never intentionally store passwords");
    expect(skill).toContain("Current system, developer, and user instructions");
    expect(skill).toContain("Raw conversation storage is disabled by default");
  });
});
