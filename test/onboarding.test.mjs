import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  proposeRules,
  approveProposal,
  renderReport,
  JsonProposalProvider,
  AnthropicProposalProvider,
} from "../src/index.ts";
import { createServer } from "node:http";
test("held-out explicit rules preserve exact source evidence", async () => {
  const doc =
    "# Boundaries\n`src/routes` must not import `src/database`\nsrc/domain cannot depend on src/ui\nKeep business logic clean";
  const p = await proposeRules(doc, "architecture.md");
  assert.equal(p.rules.length, 2);
  assert.equal(p.rules[1].line, 3);
  assert.equal(p.unhandled.length, 1);
  assert.equal(p.reviewed, false);
});
test("untrusted proposals need schema-valid source evidence", async () => {
  await assert.rejects(
    proposeRules("source", "x", {
      name: "mock",
      async propose() {
        return {
          rules: [
            {
              id: "x",
              from: "a",
              forbid: ["b"],
              reason: "x",
              line: 1,
              evidence: "invented",
            },
          ],
          unhandled: [],
        };
      },
    }),
    /evidence/,
  );
});
test("hanging providers are bounded", async () => {
  await assert.rejects(
    proposeRules(
      "x",
      "x",
      {
        name: "hung",
        propose() {
          return new Promise(() => {});
        },
      },
      20,
    ),
    /deadline/,
  );
});
test("approval guards hashes and never overwrites files", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "rules-"));
  try {
    const file = path.join(dir, "doc.md"),
      out = path.join(dir, "rules.json");
    const doc = "src/a must not import src/b";
    await writeFile(file, doc);
    const p = await proposeRules(doc, file);
    await assert.rejects(approveProposal(p, file, "wrong", out), /Stale/);
    await approveProposal(p, file, p.documentHash, out);
    assert.equal(JSON.parse(await readFile(out)).rules.length, 1);
    await assert.rejects(
      approveProposal(p, file, p.documentHash, out),
      /EEXIST/,
    );
    await writeFile(file, "changed");
    await assert.rejects(
      approveProposal(p, file, p.documentHash, path.join(dir, "other")),
      /Stale/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("report escapes source content and contains graph controls", () => {
  const html = renderReport({
    schemaVersion: 1,
    complete: false,
    files: 1,
    edges: [],
    violations: [],
    errors: [{ file: "</script><img onerror=bad>", message: "x" }],
  });
  assert.ok(!html.includes("</script><img"));
  assert.ok(html.includes("Dependency graph"));
  assert.ok(html.includes("textContent"));
});
test("JSON model bridge integrates with a controlled provider", async () => {
  const server = createServer((req, res) => {
    let text = "";
    req.on("data", (d) => (text += d));
    req.on("end", () => {
      assert.equal(JSON.parse(text).task, "propose_architecture_rules");
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ rules: [], unhandled: ["ambiguous"] }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const p = await proposeRules(
      "ambiguous",
      "doc",
      new JsonProposalProvider(`http://127.0.0.1:${server.address().port}`),
    );
    assert.equal(p.unhandled[0], "ambiguous");
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("native model adapter enforces structured source-backed proposals", async () => {
  const document = "src/a must not import src/b";
  const server = createServer((req, res) => {
    let text = "";
    req.on("data", (d) => (text += d));
    req.on("end", () => {
      const body = JSON.parse(text);
      assert.equal(body.tool_choice.name, "propose_rules");
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          content: [
            {
              type: "tool_use",
              name: "propose_rules",
              input: {
                rules: [
                  {
                    id: "a-no-b",
                    from: "src/a",
                    forbid: ["src/b"],
                    reason: document,
                    evidence: document,
                    line: 1,
                  },
                ],
                unhandled: [],
              },
            },
          ],
        }),
      );
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const p = await proposeRules(
      document,
      "doc.md",
      new AnthropicProposalProvider(
        "fixture",
        "not-a-real-key",
        `http://127.0.0.1:${server.address().port}`,
      ),
    );
    assert.equal(p.rules.length, 1);
    assert.equal(p.reviewed, false);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("HTTP providers reject credential-bearing redirects", async () => {
  let forwarded = 0;
  const target = createServer((req, res) => {
    forwarded++;
    res.end("{}");
  });
  await new Promise((r) => target.listen(0, "127.0.0.1", r));
  const origin = createServer((req, res) => {
    res.writeHead(307, {
      Location: `http://127.0.0.1:${target.address().port}`,
    });
    res.end();
  });
  await new Promise((r) => origin.listen(0, "127.0.0.1", r));
  try {
    for (const provider of [
      new JsonProposalProvider(
        `http://127.0.0.1:${origin.address().port}`,
        "test",
        "dummy",
      ),
      new AnthropicProposalProvider(
        "fixture",
        "dummy",
        `http://127.0.0.1:${origin.address().port}`,
      ),
    ])
      await assert.rejects(
        provider.propose("test", new AbortController().signal),
      );
    assert.equal(forwarded, 0);
  } finally {
    await Promise.all([
      new Promise((r) => origin.close(r)),
      new Promise((r) => target.close(r)),
    ]);
  }
});
test("rule schema rejects misleading scopes and non-string IDs", async () => {
  const { validateConfig } = await import("../src/index.ts");
  const rule = { id: "x", from: "src/a", forbid: ["src/b"], reason: "x" };
  for (const from of ["src//a", " src/a", "src/a\\b", "C:/src/a", "src/a\0"])
    assert.throws(() => validateConfig({ rules: [{ ...rule, from }] }));
  assert.throws(() => validateConfig({ rules: [{ ...rule, id: {} }] }));
  assert.throws(() => validateConfig({ rules: [{ ...rule, forbid: [] }] }));
});

test("unsupported config versions and misspelled settings cannot silently pass", async () => {
  const { validateConfig } = await import("../src/index.ts");
  assert.throws(() => validateConfig({ schemaVersion: 2, rules: [] }));
  assert.throws(() => validateConfig({ rules: [], cycle: true }));
  validateConfig({ schemaVersion: 1, rules: [] });
});

test("stored proposals missing evidence cannot pass approval", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "rules-evidence-"));
  try {
    const doc = "src/a must not import src/b";
    const file = path.join(dir, "doc");
    await writeFile(file, doc);
    const p = await proposeRules(doc, file);
    delete p.rules[0].evidence;
    delete p.rules[0].line;
    await assert.rejects(
      approveProposal(p, file, p.documentHash, path.join(dir, "output")),
      /Evidence/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("malformed architecture report fails before HTML creation", () => {
  for (const invalid of [
    {},
    {
      schemaVersion: 1,
      complete: true,
      files: 1,
      edges: [],
      violations: [{}],
      errors: [],
    },
    {
      schemaVersion: 2,
      complete: true,
      files: 0,
      edges: [],
      violations: [],
      errors: [],
    },
  ])
    assert.throws(() => renderReport(invalid), /Invalid/);
});
