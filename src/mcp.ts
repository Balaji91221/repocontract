import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { checkRepository, type Rule } from "./index.ts";

/** One root and config are pinned at startup; tools cannot switch filesystem roots. */
export async function serve(rootInput: string, configPath: string) {
  const root = realpathSync(rootInput);
  const config = JSON.parse(readFileSync(configPath, "utf8")) as {
    rules: Rule[];
    cycles?: boolean;
  };
  checkRepository(root, config); // Validate before advertising tools.
  const server = new Server(
    { name: "repocontract", version: "0.2.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "check_repository",
        description:
          "Check the configured repository against approved architecture rules. Returns completeness, violations, and source evidence.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: "get_rules",
        description:
          "Get approved rules whose source scope includes a repository-relative file path.",
        inputSchema: {
          type: "object",
          properties: { file_path: { type: "string" } },
          required: ["file_path"],
          additionalProperties: false,
        },
      },
    ],
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const args = request.params.arguments ?? {};
      let result;
      if (request.params.name === "check_repository") {
        if (Object.keys(args).length)
          throw new Error("check_repository takes no arguments");
        result = checkRepository(root, config);
      } else if (request.params.name === "get_rules") {
        if (
          typeof args.file_path !== "string" ||
          Object.keys(args).some((k) => k !== "file_path")
        )
          throw new Error("Expected only file_path");
        const resolved = path.resolve(root, args.file_path);
        const relative = path
          .relative(root, resolved)
          .split(path.sep)
          .join("/");
        if (
          path.isAbsolute(args.file_path) ||
          relative === ".." ||
          relative.startsWith("../")
        )
          throw new Error("Path must be inside configured root");
        result = {
          file: relative,
          rules: config.rules.filter(
            (r) =>
              r.from === "." ||
              relative === r.from ||
              relative.startsWith(r.from.replace(/\/$/, "") + "/"),
          ),
        };
      } else throw new Error("Unknown tool");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: String(error) }],
      };
    }
  });
  await server.connect(new StdioServerTransport());
  const close = () => void server.close();
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  return server;
}
