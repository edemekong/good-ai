import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  CreateExperienceInputSchema,
  ExperienceSchema,
  createExperienceService,
  openDatabase,
  type ExperienceService,
  type OpenDatabaseResult,
} from "@thinkinteltech/core";
import { z } from "zod";

const IdSchema = z.string().trim().min(1);
const SearchInputSchema = z
  .object({
    query: z.string(),
    limit: z.number().int().positive().max(100).optional(),
  })
  .strict();
const UpdateInputSchema = CreateExperienceInputSchema.extend({
  id: IdSchema,
});
const FeedbackInputSchema = z
  .object({
    experienceId: IdSchema,
    outcome: z.enum(["success", "failure", "partial"]),
  })
  .strict();
const IdInputSchema = z
  .object({
    id: IdSchema,
  })
  .strict();

export interface GoodAiMcpServer {
  server: McpServer;
  service: ExperienceService;
  storage: OpenDatabaseResult;
}

export interface GoodAiMcpOptions {
  storage?: OpenDatabaseResult;
  userHome?: string;
  configPath?: string;
  databasePath?: string;
}

export function createGoodAiMcpServer(
  options: GoodAiMcpOptions = {},
): GoodAiMcpServer {
  const storage =
    options.storage ??
    openDatabase({
      userHome: options.userHome,
      configPath: options.configPath,
      databasePath: options.databasePath,
    });
  const service = createExperienceService(storage);
  const server = new McpServer({
    name: "good-ai",
    version: "0.1.2",
  });

  server.registerTool(
    "good_ai_record",
    {
      title: "Record a successful Good-AI experience",
      description:
        "Store a reusable, structured lesson from a successful interaction.",
      inputSchema: CreateExperienceInputSchema,
    },
    async (input) => safeTool(() => service.record(input)),
  );

  server.registerTool(
    "good_ai_search",
    {
      title: "Search Good-AI experiences",
      description:
        "Find relevant previous experiences using a host-generated query.",
      inputSchema: SearchInputSchema,
    },
    async ({ query, limit }) =>
      safeTool(() => ({ experiences: service.search(query, limit) })),
  );

  server.registerTool(
    "good_ai_get",
    {
      title: "Retrieve a Good-AI experience",
      description: "Retrieve the complete structured experience by ID.",
      inputSchema: IdInputSchema,
    },
    async ({ id }) => safeTool(() => service.get(id)),
  );

  server.registerTool(
    "good_ai_feedback",
    {
      title: "Record reuse feedback",
      description:
        "Record whether reusing an experience succeeded, failed, or was partial.",
      inputSchema: FeedbackInputSchema,
    },
    async ({ experienceId, outcome }) =>
      safeTool(() => service.feedback(experienceId, outcome)),
  );

  server.registerTool(
    "good_ai_update",
    {
      title: "Update a Good-AI experience",
      description: "Correct or refine an existing structured experience.",
      inputSchema: UpdateInputSchema,
    },
    async ({ id, ...input }) => safeTool(() => service.update(id, input)),
  );

  server.registerTool(
    "good_ai_delete",
    {
      title: "Delete a Good-AI experience",
      description: "Permanently delete an experience from local storage.",
      inputSchema: IdInputSchema,
    },
    async ({ id }) => {
      return safeTool(() => {
        service.delete(id);
        return { id, deleted: true };
      });
    },
  );

  return { server, service, storage };
}

export async function startGoodAiMcpServer(
  options: GoodAiMcpOptions = {},
): Promise<GoodAiMcpServer> {
  const mcp = createGoodAiMcpServer(options);
  const transport = new StdioServerTransport();
  await mcp.server.connect(transport);
  return mcp;
}

function toolResult(value: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value),
      },
    ],
    structuredContent: toStructuredContent(value),
  };
}

async function safeTool(action: () => unknown): Promise<CallToolResult> {
  try {
    return toolResult(await action());
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMessage(error) }),
        },
      ],
      isError: true,
    };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Good-AI tool failed";
}

function toStructuredContent(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return { value };
}

export const mcpExperienceSchema = ExperienceSchema;
