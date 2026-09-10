import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createGoodAiMcpServer } from "../src/server.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("first milestone acceptance flow", () => {
  it("records, retrieves, reuses, and records feedback through MCP", async () => {
    const userHome = mkdtempSync(join(tmpdir(), "good-ai-acceptance-test-"));
    temporaryDirectories.push(userHome);
    const mcp = createGoodAiMcpServer({ userHome });
    const client = new Client({ name: "acceptance-client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      mcp.server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const recorded = await client.callTool({
      name: "good_ai_record",
      arguments: {
        task: {
          title: "Make a UI feel premium without changing layout",
          category: "frontend-design",
          intent: "visual_refinement",
          tags: ["premium", "ui"],
        },
        recipe: {
          approach:
            "Preserve the information architecture while improving hierarchy.",
          instructions: ["Improve spacing", "Improve typography"],
          constraints: ["Do not rewrite the layout"],
          context: [],
          tools: [],
        },
        environment: { client: "acceptance-client" },
        success: {
          confidence: 0.96,
          signals: [
            {
              type: "explicit_positive_feedback",
              summary: "The user said the result was exactly right.",
            },
          ],
        },
      },
    });
    const experience = readJson(recorded) as { id: string };

    const search = await client.callTool({
      name: "good_ai_search",
      arguments: { query: "premium UI preserve layout" },
    });
    expect(
      (readJson(search) as { experiences: unknown[] }).experiences,
    ).toHaveLength(1);

    const retrieved = await client.callTool({
      name: "good_ai_get",
      arguments: { id: experience.id },
    });
    expect((readJson(retrieved) as { id: string }).id).toBe(experience.id);

    const feedback = await client.callTool({
      name: "good_ai_feedback",
      arguments: { experienceId: experience.id, outcome: "success" },
    });
    expect(
      (
        readJson(feedback) as {
          success: { reproduction: { attempts: number; successes: number } };
        }
      ).success.reproduction,
    ).toEqual({ attempts: 1, successes: 1, failures: 0 });

    await client.close();
    await mcp.server.close();
    mcp.storage.sqlite.close();
  });
});

function readJson(result: unknown): unknown {
  const content = (result as { content?: Array<{ text?: string }> }).content;
  return JSON.parse(content?.[0]?.text ?? "null");
}
