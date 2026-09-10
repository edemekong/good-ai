import { describe, expect, it } from "vitest";
import {
  CreateExperienceInputSchema,
  ExperienceSchema,
  createExperience,
} from "./index.js";

const validInput = {
  task: {
    title: "Improve UI without changing layout",
    category: "frontend-design",
    intent: "visual_refinement",
    tags: ["ui", "design"],
  },
  recipe: {
    approach:
      "Preserve information architecture while improving visual hierarchy.",
    instructions: ["Keep layout structure", "Improve spacing"],
    constraints: ["Do not rewrite the entire interface"],
    context: [],
    tools: [],
  },
  environment: {
    client: "codex",
  },
  success: {
    confidence: 0.94,
    signals: [
      {
        type: "explicit_positive_feedback",
        summary: "User said the result was exactly right.",
      },
    ],
  },
};

describe("Experience schema", () => {
  it("validates semantic input and applies generated defaults", () => {
    const input = CreateExperienceInputSchema.parse(validInput);
    const experience = createExperience(input, {
      id: "exp_test-1",
      now: new Date("2026-09-10T00:00:00.000Z"),
    });

    expect(experience).toMatchObject({
      id: "exp_test-1",
      schemaVersion: 1,
      environment: { client: "codex", model: "unknown" },
      source: { rawConversationStored: false },
      success: {
        reproduction: { attempts: 0, successes: 0, failures: 0 },
      },
      createdAt: "2026-09-10T00:00:00.000Z",
      updatedAt: "2026-09-10T00:00:00.000Z",
    });
    expect(ExperienceSchema.safeParse(experience).success).toBe(true);
  });

  it("rejects invalid confidence and unknown conversation fields", () => {
    expect(() =>
      CreateExperienceInputSchema.parse({
        ...validInput,
        success: { ...validInput.success, confidence: 1.1 },
      }),
    ).toThrow();

    expect(() =>
      CreateExperienceInputSchema.parse({
        ...validInput,
        rawConversation: "do not store this",
      }),
    ).toThrow();
  });

  it("rejects empty success evidence", () => {
    expect(() =>
      CreateExperienceInputSchema.parse({
        ...validInput,
        success: { confidence: 0.2, signals: [] },
      }),
    ).toThrow();
  });
});
