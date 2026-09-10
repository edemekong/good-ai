import { randomUUID } from "node:crypto";
import {
  CreateExperienceInputSchema,
  ExperienceSchema,
} from "../schemas/experience.js";
import type { Experience } from "../models/experience.js";

export function createExperience(
  input: unknown,
  options: { id?: string; now?: Date } = {},
): Experience {
  const semanticInput = CreateExperienceInputSchema.parse(input);
  const timestamp = (options.now ?? new Date()).toISOString();

  return ExperienceSchema.parse({
    ...semanticInput,
    id: options.id ?? `exp_${randomUUID()}`,
    schemaVersion: 1,
    success: {
      ...semanticInput.success,
      reproduction: {
        attempts: 0,
        successes: 0,
        failures: 0,
      },
    },
    source: {
      rawConversationStored: false,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
