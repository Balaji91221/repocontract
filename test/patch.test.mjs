import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { checkPatch } from "../src/index.ts";
test("proposed patch is checked without modifying user checkout", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "patch-rules-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  try {
    git("init", "-q");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Fixture");
    await mkdir(path.join(dir, "routes"));
    await mkdir(path.join(dir, "db"));
    await writeFile(path.join(dir, "routes/a.ts"), "export const a=1;\n");
    await writeFile(path.join(dir, "db/a.ts"), "export const x=1;\n");
    git("add", ".");
    git("commit", "-qm", "fixture");
    await writeFile(
      path.join(dir, "routes/a.ts"),
      "import {x} from '../db/a';\nexport const a=x;\n",
    );
    const patch = git("diff");
    const before = await readFile(path.join(dir, "routes/a.ts"), "utf8");
    const r = await checkPatch(dir, "HEAD", patch, {
      rules: [
        {
          id: "boundary",
          from: "routes",
          forbid: ["db"],
          reason: "Use services",
        },
      ],
    });
    assert.equal(r.violations.length, 1);
    assert.equal(await readFile(path.join(dir, "routes/a.ts"), "utf8"), before);
    await assert.rejects(
      checkPatch(dir, "--help", patch, { rules: [] }),
      /Invalid/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
