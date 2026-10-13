import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkRepository } from "../src/index.ts";
function fixture(files, fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), "repocontract-"));
  try {
    for (const [p, t] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
      writeFileSync(path.join(root, p), t);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const rules = [
  { id: "boundary", from: "routes", forbid: ["db"], reason: "Use services" },
];
test("forbidden import has source evidence", () =>
  fixture(
    {
      "routes/a.ts": "import {x} from '../db/a';",
      "db/a.ts": "export const x=1;",
    },
    (root) => {
      const r = checkRepository(root, { rules });
      assert.equal(r.complete, true);
      assert.equal(r.violations[0].edge.line, 1);
    },
  ));
test("comments do not create false dependencies", () =>
  fixture(
    { "routes/a.ts": "// import x from '../db/a';\nexport const x=1;" },
    (root) => assert.equal(checkRepository(root, { rules }).edges.length, 0),
  ));
test("unresolved and dynamic imports are incomplete", () =>
  fixture(
    { "a.ts": "import x from './missing'; import(getPath());" },
    (root) => {
      const r = checkRepository(root, { rules: [] });
      assert.equal(r.complete, false);
      assert.equal(r.errors.length, 2);
    },
  ));
test("tsconfig aliases resolve", () =>
  fixture(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: { baseUrl: ".", paths: { "@db/*": ["db/*"] } },
      }),
      "routes/a.ts": "export {x} from '@db/a';",
      "db/a.ts": "export const x=1;",
    },
    (root) =>
      assert.equal(checkRepository(root, { rules }).violations.length, 1),
  ));
test("cycles are detected", () =>
  fixture(
    {
      "a.ts": "export {b} from './b'; export const a=1;",
      "b.ts": "export {a} from './a'; export const b=1;",
    },
    (root) =>
      assert.equal(
        checkRepository(root, { rules: [], cycles: true }).violations.length,
        1,
      ),
  ));
test("syntax errors cannot pass", () =>
  fixture({ "a.ts": "export const = ;" }, (root) =>
    assert.equal(checkRepository(root, { rules: [] }).complete, false),
  ));

test("import type expressions participate in boundaries", () =>
  fixture(
    {
      "routes/a.ts": "type T = import('../db/a').Secret;",
      "db/a.ts": "export type Secret = string;",
    },
    (root) => {
      const r = checkRepository(root, { rules });
      assert.equal(r.complete, true);
      assert.equal(r.violations.length, 1);
    },
  ));
test("ambiguous dot prefixes are rejected and root scope works", () =>
  fixture(
    {
      "routes/a.ts": "import {x} from '../db/a';",
      "db/a.ts": "export const x=1;",
    },
    (root) => {
      assert.throws(
        () =>
          checkRepository(root, { rules: [{ ...rules[0], from: "./routes" }] }),
        /prefixes/,
      );
      assert.equal(
        checkRepository(root, { rules: [{ ...rules[0], from: "." }] })
          .violations.length,
        1,
      );
    },
  ));

test("modern module extensions are analyzed", () => {
  for (const ext of ["mts", "cts", "mjs", "cjs"])
    fixture(
      {
        ["routes/a." + ext]: "import {x} from '../db/a." + ext + "';",
        ["db/a." + ext]: "export const x=1;",
      },
      (root) => {
        const r = checkRepository(root, { rules });
        assert.equal(r.files, 2);
        assert.equal(r.violations.length, 1, ext);
      },
    );
});

test("a repository installed under node_modules still has internal edges", () =>
  fixture(
    {
      "node_modules/example/routes/a.ts": "import {x} from '../db/a';",
      "node_modules/example/db/a.ts": "export const x=1;",
    },
    (root) => {
      const r = checkRepository(path.join(root, "node_modules/example"), {
        rules,
      });
      assert.equal(r.violations.length, 1);
    },
  ));
