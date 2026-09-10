import type Database from "better-sqlite3";
import {
  CreateExperienceInputSchema,
  ExperienceSchema,
} from "../schemas/experience.js";
import type { Experience, FeedbackOutcome } from "../models/experience.js";
import { assertNoSensitiveSecrets } from "../privacy/sensitive-data.js";
import {
  removeExperienceSearch,
  searchExperiences,
  type ExperienceSearchResult,
  upsertExperienceSearchInTransaction,
} from "../search/experience-search.js";
import { createExperience } from "./experience-factory.js";
import type { OpenDatabaseResult } from "../storage/database.js";
import { nextTimestamp } from "../utils/time.js";

export class ExperienceNotFoundError extends Error {
  readonly code = "EXPERIENCE_NOT_FOUND";

  constructor(id: string) {
    super(`Experience not found: ${id}`);
    this.name = "ExperienceNotFoundError";
  }
}

export class ExperienceService {
  constructor(private readonly storage: OpenDatabaseResult) {}

  record(input: unknown): Experience {
    const semanticInput = CreateExperienceInputSchema.parse(input);
    assertNoSensitiveSecrets(semanticInput);
    const experience = createExperience(semanticInput);
    this.storage.sqlite.transaction(() => {
      this.insert(experience);
      upsertExperienceSearchInTransaction(this.storage.sqlite, experience);
    })();
    return experience;
  }

  get(id: string): Experience {
    const row = this.storage.sqlite
      .prepare("SELECT payload FROM experiences WHERE id = ?")
      .get(id) as { payload: string } | undefined;

    if (!row) {
      throw new ExperienceNotFoundError(id);
    }

    return ExperienceSchema.parse(JSON.parse(row.payload));
  }

  list(): Experience[] {
    const rows = this.storage.sqlite
      .prepare("SELECT payload FROM experiences ORDER BY updated_at DESC")
      .all() as Array<{ payload: string }>;

    return rows.map((row) => ExperienceSchema.parse(JSON.parse(row.payload)));
  }

  search(query: string, limit = 5): ExperienceSearchResult[] {
    return searchExperiences(this.storage.sqlite, query, limit);
  }

  update(id: string, input: unknown): Experience {
    const existing = this.get(id);
    const semanticInput = CreateExperienceInputSchema.parse(input);
    assertNoSensitiveSecrets(semanticInput);
    const replacement = createExperience(semanticInput, { id });
    const updated = ExperienceSchema.parse({
      ...replacement,
      createdAt: existing.createdAt,
      updatedAt: nextTimestamp(existing.updatedAt),
    });

    this.storage.sqlite.transaction(() => {
      this.replace(updated);
      upsertExperienceSearchInTransaction(this.storage.sqlite, updated);
    })();
    return updated;
  }

  delete(id: string): void {
    this.get(id);
    this.storage.sqlite.transaction(() => {
      this.storage.sqlite
        .prepare("DELETE FROM experiences WHERE id = ?")
        .run(id);
      removeExperienceSearch(this.storage.sqlite, id);
    })();
  }

  feedback(id: string, outcome: FeedbackOutcome): Experience {
    const experience = this.get(id);
    const reproduction = {
      ...experience.success.reproduction,
      attempts: experience.success.reproduction.attempts + 1,
    };

    if (outcome === "success") {
      reproduction.successes += 1;
    } else if (outcome === "failure") {
      reproduction.failures += 1;
    }

    const updated = ExperienceSchema.parse({
      ...experience,
      success: {
        ...experience.success,
        reproduction,
      },
      updatedAt: nextTimestamp(experience.updatedAt),
    });

    this.replace(updated);
    return updated;
  }

  private insert(experience: Experience): void {
    this.storage.sqlite
      .prepare(
        `INSERT INTO experiences (
          id,
          schema_version,
          payload,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        experience.id,
        experience.schemaVersion,
        JSON.stringify(experience),
        experience.createdAt,
        experience.updatedAt,
      );
  }

  private replace(experience: Experience): void {
    this.storage.sqlite
      .prepare(
        `UPDATE experiences
        SET schema_version = ?, payload = ?, updated_at = ?
        WHERE id = ?`,
      )
      .run(
        experience.schemaVersion,
        JSON.stringify(experience),
        experience.updatedAt,
        experience.id,
      );
  }
}

export function createExperienceService(
  storage: OpenDatabaseResult,
): ExperienceService {
  return new ExperienceService(storage);
}

export function closeStorage(storage: OpenDatabaseResult): void {
  (storage.sqlite as Database.Database).close();
}
