import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ExperienceNotFoundError,
  SensitiveDataError,
  closeStorage,
  createExperienceService,
  openDatabase,
} from "./index.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createService() {
  const userHome = mkdtempSync(join(tmpdir(), "good-ai-service-test-"));
  temporaryDirectories.push(userHome);
  const storage = openDatabase({ userHome });
  return { service: createExperienceService(storage), storage };
}

function validInput(title = "Improve the UI") {
  return {
    task: {
      title,
      category: "frontend-design",
      intent: "visual_refinement",
      tags: ["ui"],
    },
    recipe: {
      approach: "Preserve structure while improving hierarchy.",
      instructions: ["Improve spacing"],
      constraints: ["Do not rewrite the interface"],
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
  };
}

describe("ExperienceService", () => {
  it("records, retrieves, lists, and searches experiences", () => {
    const { service, storage } = createService();
    const experience = service.record(validInput());

    expect(service.get(experience.id)).toEqual(experience);
    expect(service.list()).toEqual([experience]);
    expect(service.search("improve hierarchy")).toEqual([
      expect.objectContaining({ id: experience.id }),
    ]);
    closeStorage(storage);
  });

  it("updates semantic content and keeps identity stable", () => {
    const { service, storage } = createService();
    const experience = service.record(validInput());
    const updated = service.update(
      experience.id,
      validInput("Improve the premium UI"),
    );

    expect(updated.id).toBe(experience.id);
    expect(updated.createdAt).toBe(experience.createdAt);
    expect(updated.updatedAt).not.toBe(experience.updatedAt);
    expect(service.search("premium")).toEqual([
      expect.objectContaining({ id: experience.id }),
    ]);
    closeStorage(storage);
  });

  it("records success, failure, and partial feedback", () => {
    const { service, storage } = createService();
    const experience = service.record(validInput());

    service.feedback(experience.id, "success");
    service.feedback(experience.id, "failure");
    const updated = service.feedback(experience.id, "partial");

    expect(updated.success.reproduction).toEqual({
      attempts: 3,
      successes: 1,
      failures: 1,
    });
    closeStorage(storage);
  });

  it("deletes experiences and reports missing IDs", () => {
    const { service, storage } = createService();
    const experience = service.record(validInput());

    service.delete(experience.id);
    expect(service.list()).toEqual([]);
    expect(() => service.get(experience.id)).toThrow(ExperienceNotFoundError);
    expect(() => service.delete(experience.id)).toThrow(
      ExperienceNotFoundError,
    );
    closeStorage(storage);
  });

  it("rejects obvious secrets before persistence", () => {
    const { service, storage } = createService();

    expect(() =>
      service.record({
        ...validInput(),
        recipe: {
          ...validInput().recipe,
          context: ["api_key=super-secret-value"],
        },
      }),
    ).toThrow(SensitiveDataError);
    expect(service.list()).toEqual([]);
    closeStorage(storage);
  });
});
