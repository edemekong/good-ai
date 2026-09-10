import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createGoodAiMcpServer } from "./server.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Good-AI MCP server", () => {
  it("exposes the six deterministic tools and runs the lifecycle", async () => {
    const userHome = mkdtempSync(join(tmpdir(), "good-ai-mcp-test-"));
    temporaryDirectories.push(userHome);
    const mcp = createGoodAiMcpServer({ userHome });
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      mcp.server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "good_ai_record",
      "good_ai_search",
      "good_ai_get",
      "good_ai_feedback",
      "good_ai_update",
      "good_ai_delete",
    ]);

    const input = {
      task: {
        title: "Improve UI without changing layout",
        category: "frontend-design",
        intent: "visual_refinement",
        tags: ["ui"],
      },
      recipe: {
        approach: "Preserve layout while improving hierarchy.",
        instructions: ["Improve spacing"],
        constraints: [],
        context: [],
        tools: [],
      },
      environment: { client: "codex" },
      success: {
        confidence: 0.95,
        signals: [
          {
            type: "explicit_positive_feedback",
            summary: "The user approved the result.",
          },
        ],
      },
    };

    const recorded = await client.callTool({
      name: "good_ai_record",
      arguments: input,
    });
    const experience = readToolJson(recorded) as {
      id: string;
      task: { title: string };
    };
    expect(experience.task.title).toBe(input.task.title);

    const search = await client.callTool({
      name: "good_ai_search",
      arguments: { query: "visual hierarchy" },
    });
    expect(
      (readToolJson(search) as { experiences: unknown[] }).experiences,
    ).toHaveLength(1);

    const feedback = await client.callTool({
      name: "good_ai_feedback",
      arguments: { experienceId: experience.id, outcome: "success" },
    });
    expect(
      (
        readToolJson(feedback) as {
          success: { reproduction: { successes: number } };
        }
      ).success.reproduction.successes,
    ).toBe(1);

    await client.close();
    await mcp.server.close();
    mcp.storage.sqlite.close();
  });
});

function readToolJson(result: unknown): unknown {
  const content = (result as { content?: Array<{ text?: string }> }).content;
  return JSON.parse(content?.[0]?.text ?? "null");
}
