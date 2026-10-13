import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
test(
  "MCP client can query rules and run checks but cannot switch root",
  { timeout: 10000 },
  async () => {
    const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    const root = fileURLToPath(
      new URL("../examples/repository", import.meta.url),
    );
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cli, "serve", root, root + "/rules.json"],
      stderr: "pipe",
    });
    try {
      await client.connect(transport);
      assert.equal((await client.listTools()).tools.length, 2);
      const rules = await client.callTool({
        name: "get_rules",
        arguments: { file_path: "src/routes/orders.ts" },
      });
      assert.equal(JSON.parse(rules.content[0].text).rules.length, 1);
      const report = await client.callTool({
        name: "check_repository",
        arguments: {},
      });
      assert.equal(JSON.parse(report.content[0].text).violations.length, 1);
      const blocked = await client.callTool({
        name: "get_rules",
        arguments: { file_path: "../../secrets" },
      });
      assert.equal(blocked.isError, true);
    } finally {
      await client.close();
    }
  },
);
