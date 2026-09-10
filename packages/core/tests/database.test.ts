import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadOrCreateConfig } from "../src/storage/config.js";
import { openDatabase } from "../src/storage/database.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createTemporaryHome(): string {
  const directory = mkdtempSync(join(tmpdir(), "good-ai-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("local SQLite storage", () => {
  it("creates the default config, database, and migration schema", () => {
    const userHome = createTemporaryHome();
    const opened = openDatabase({ userHome });

    expect(existsSync(opened.paths.configPath)).toBe(true);
    expect(existsSync(opened.paths.databasePath)).toBe(true);
    expect(
      opened.sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'experiences'",
        )
        .get(),
    ).toEqual({ name: "experiences" });
    expect(
      opened.sqlite.prepare("SELECT version FROM schema_migrations").all(),
    ).toEqual([{ version: 1 }, { version: 2 }]);

    opened.sqlite.close();
  });

  it("is idempotent and preserves stored rows across reopen", () => {
    const userHome = createTemporaryHome();
    const first = openDatabase({ userHome });
    first.sqlite
      .prepare(
        "INSERT INTO experiences (id, schema_version, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        "exp_test",
        1,
        "{}",
        "2026-09-10T00:00:00.000Z",
        "2026-09-10T00:00:00.000Z",
      );
    first.sqlite.close();

    const second = openDatabase({ userHome });
    expect(
      second.sqlite.prepare("SELECT COUNT(*) AS count FROM experiences").get(),
    ).toEqual({
      count: 1,
    });
    expect(
      second.sqlite
        .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
        .get(),
    ).toEqual({
      count: 2,
    });
    second.sqlite.close();
  });

  it("preserves an existing custom config", () => {
    const userHome = createTemporaryHome();
    const config = loadOrCreateConfig({ userHome });
    const customDatabasePath = join(userHome, "custom", "memory.db");
    writeFileSync(
      config.paths.configPath,
      `${JSON.stringify(
        {
          version: 1,
          storage: { provider: "sqlite", path: customDatabasePath },
        },
        null,
      )}\n`,
    );

    const opened = openDatabase({ userHome });
    expect(opened.paths.databasePath).toBe(customDatabasePath);
    expect(JSON.parse(readFileSync(config.paths.configPath, "utf8"))).toEqual({
      version: 1,
      storage: { provider: "sqlite", path: customDatabasePath },
    });
    opened.sqlite.close();
  });
});
