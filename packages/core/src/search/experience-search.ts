import type Database from "better-sqlite3";
import type { Experience } from "../models/experience.js";

export interface ExperienceSearchResult {
  id: string;
  title: string;
  category: string;
  intent: string;
  tags: string[];
  score: number;
}

export function upsertExperienceSearch(
  sqlite: Database.Database,
  experience: Experience,
): void {
  sqlite.transaction(() => {
    upsertExperienceSearchInTransaction(sqlite, experience);
  })();
}

export function upsertExperienceSearchInTransaction(
  sqlite: Database.Database,
  experience: Experience,
): void {
  removeExperienceSearch(sqlite, experience.id);
  sqlite
    .prepare(
      `INSERT INTO experiences_fts (
        experience_id,
        task_title,
        category,
        intent,
        tags,
        approach,
        instructions,
        constraints,
        context,
        tools
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      experience.id,
      experience.task.title,
      experience.task.category,
      experience.task.intent,
      experience.task.tags.join(" "),
      experience.recipe.approach,
      experience.recipe.instructions.join(" "),
      experience.recipe.constraints.join(" "),
      experience.recipe.context.join(" "),
      experience.recipe.tools
        .map((tool) => `${tool.name} ${tool.purpose}`)
        .join(" "),
    );
}

export function removeExperienceSearch(
  sqlite: Database.Database,
  experienceId: string,
): void {
  sqlite
    .prepare("DELETE FROM experiences_fts WHERE experience_id = ?")
    .run(experienceId);
}

export function searchExperiences(
  sqlite: Database.Database,
  query: string,
  limit = 5,
): ExperienceSearchResult[] {
  const matchQuery = toFtsMatchQuery(query);
  if (matchQuery.length === 0) {
    return [];
  }

  const boundedLimit = normalizeLimit(limit);
  const rows = sqlite
    .prepare(
      `SELECT
        experience_id AS id,
        task_title AS title,
        category,
        intent,
        tags,
        bm25(experiences_fts) AS score
      FROM experiences_fts
      WHERE experiences_fts MATCH ?
      ORDER BY score ASC
      LIMIT ?`,
    )
    .all(matchQuery, boundedLimit) as Array<{
    id: string;
    title: string;
    category: string;
    intent: string;
    tags: string;
    score: number;
  }>;

  return rows.map((row) => ({
    ...row,
    tags: row.tags.length > 0 ? row.tags.split(/\s+/u) : [],
  }));
}

export function toFtsMatchQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/u)
    .map((token) => token.replace(/^[^\p{L}\p{N}_-]+|[^\p{L}\p{N}_-]+$/gu, ""))
    .filter(Boolean)
    .map((token) => `"${token.replaceAll('"', '""')}"`)
    .join(" OR ");
}

function normalizeLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Search limit must be a positive integer");
  }

  return Math.min(limit, 100);
}
