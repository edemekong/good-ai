import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installGoodAi } from "../src/installer.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Good-AI installer", () => {
  it("creates local storage and installs the skill without a client config", () => {
    const userHome = mkdtempSync(join(tmpdir(), "good-ai-install-test-"));
    temporaryDirectories.push(userHome);

    const report = installGoodAi({ userHome });

    expect(report.ready).toBe(true);
    expect(report.skillInstalled).toBe(true);
    expect(readFileSync(report.skillPath, "utf8")).toContain("Good-AI");
    expect(report.clients.every((client) => !client.detected)).toBe(true);
  });

  it("merges a JSON client config and preserves existing entries on rerun", () => {
    const userHome = mkdtempSync(join(tmpdir(), "good-ai-install-test-"));
    temporaryDirectories.push(userHome);
    const configPath = join(userHome, ".cursor", "mcp.json");
    const original = {
      custom: { enabled: true },
      mcpServers: { existing: { command: "existing" } },
    };
    mkdirSync(join(userHome, ".cursor"), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(original)}\n`);

    const first = installGoodAi({ userHome });
    const cursor = first.clients.find((client) => client.name === "Cursor");
    expect(cursor).toMatchObject({ detected: true, registered: true });

    const updated = JSON.parse(readFileSync(configPath, "utf8"));
    expect(updated.custom).toEqual({ enabled: true });
    expect(updated.mcpServers.existing).toEqual({ command: "existing" });
    expect(updated.mcpServers["good-ai"]).toEqual({
      command: "good-ai",
      args: ["mcp"],
    });

    const second = installGoodAi({ userHome });
    expect(
      second.clients.find((client) => client.name === "Cursor"),
    ).toMatchObject({
      detected: true,
      registered: false,
      reason: "Existing good-ai configuration preserved.",
    });
    expect(JSON.parse(readFileSync(configPath, "utf8"))).toEqual(updated);
  });

  it("registers Codex in TOML and preserves the entry on rerun", () => {
    const userHome = mkdtempSync(join(tmpdir(), "good-ai-install-test-"));
    temporaryDirectories.push(userHome);
    const configPath = join(userHome, ".codex", "config.toml");
    mkdirSync(join(userHome, ".codex"), { recursive: true });
    writeFileSync(configPath, '[model]\nmodel = "gpt-5"\n');

    const first = installGoodAi({ userHome });
    const codex = first.clients.find((client) => client.name === "Codex");
    expect(codex).toMatchObject({ detected: true, registered: true });
    expect(readFileSync(configPath, "utf8")).toContain(
      '[mcp_servers.good_ai]\ncommand = "good-ai"\nargs = ["mcp"]',
    );

    const second = installGoodAi({ userHome });
    expect(
      second.clients.find((client) => client.name === "Codex"),
    ).toMatchObject({
      detected: true,
      registered: false,
      reason: "Existing good-ai configuration preserved.",
    });
    expect(readFileSync(configPath, "utf8")).toMatch(
      /\[mcp_servers\.good_ai\]/gu,
    );
  });
});
