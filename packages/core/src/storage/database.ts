import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import {
  loadOrCreateConfig,
  resolveStoragePath,
  type GoodAiConfig,
  type GoodAiPaths,
} from "./config.js";
import { schema } from "./schema.js";

const migrations = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS experiences (
        id TEXT PRIMARY KEY NOT NULL,
        schema_version INTEGER NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS experiences_updated_at_idx
        ON experiences (updated_at DESC)`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE VIRTUAL TABLE IF NOT EXISTS experiences_fts USING fts5(
        experience_id UNINDEXED,
        task_title,
        category,
        intent,
        tags,
        approach,
        instructions,
        constraints,
        context,
        tools
      )`,
    ],
  },
] as const;

export interface OpenDatabaseResult {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
  config: GoodAiConfig;
  paths: GoodAiPaths;
}

export type GoodAiStorage = OpenDatabaseResult;

export function openDatabase(
  options: {
    userHome?: string;
    configPath?: string;
    databasePath?: string;
  } = {},
): OpenDatabaseResult {
  const loaded = loadOrCreateConfig(options);
  const databasePath = options.databasePath
    ? resolveStoragePath(options.databasePath, loaded.paths.configPath)
    : loaded.paths.databasePath;

  mkdirSync(dirname(databasePath), { recursive: true });

  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  runMigrations(sqlite);

  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
    config: loaded.config,
    paths: {
      ...loaded.paths,
      databasePath,
    },
  };
}

function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = sqlite
    .prepare("SELECT version FROM schema_migrations ORDER BY version")
    .all() as Array<{ version: number }>;
  const appliedVersions = new Set(
    applied.map((migration) => migration.version),
  );

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    sqlite.transaction(() => {
      for (const statement of migration.statements) {
        sqlite.exec(statement);
      }

      sqlite
        .prepare(
          "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        )
        .run(migration.version, new Date().toISOString());
    })();
  }
}
