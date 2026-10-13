import {
  mkdtemp,
  rm,
  mkdir,
  writeFile,
  realpath,
  lstat,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { checkRepository, type Config } from "./index.ts";
export async function checkPatch(
  repo: string,
  base: string,
  patch: string,
  config: Config,
) {
  if (
    !base ||
    base.startsWith("-") ||
    typeof patch !== "string" ||
    patch.length > 5_000_000
  )
    throw new Error("Invalid patch input");
  repo = await realpath(repo);
  const git = (args: string[], cwd = repo) =>
    execFileSync("git", ["--no-pager", ...args], {
      cwd,
      encoding: "utf8",
      maxBuffer: 16_000_000,
      timeout: 10000,
      env: {
        PATH: process.env.PATH,
        HOME: tmpdir(),
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
      },
    });
  const sha = git(["rev-parse", "--verify", `${base}^{commit}`]).trim();
  const workspace = await mkdtemp(path.join(tmpdir(), "repocontract-patch-"));
  const temp = path.join(workspace, "snapshot");
  await mkdir(temp);
  const safe = (name: string) => {
    if (
      path.isAbsolute(name) ||
      name.split("/").some((x) => x === ".." || x === ".git") ||
      name.includes("\\")
    )
      throw new Error("Unsafe patch path");
    return path.join(temp, name);
  };
  try {
    for (const entry of git(["ls-tree", "-r", "-z", sha])
      .split("\0")
      .filter(Boolean)) {
      const m = entry.match(/^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/);
      if (!m) throw new Error("Invalid tree entry");
      if (!["100644", "100755"].includes(m[1]) || m[2] !== "blob")
        throw new Error("Only ordinary file snapshots supported");
      const target = safe(m[4]);
      await mkdir(path.dirname(target), { recursive: true });
      const data = execFileSync("git", ["cat-file", "blob", m[3]], {
        cwd: repo,
        maxBuffer: 16_000_000,
        timeout: 10000,
      });
      await writeFile(target, data);
    }
    if (
      /^\+\+\+ (?![ab]\/|\/dev\/null)/m.test(patch) ||
      /^(?:new|old) mode 120000/m.test(patch)
    )
      throw new Error("Unsupported patch");
    const patchPath = path.join(workspace, "proposed.patch");
    await writeFile(patchPath, patch);
    git(["apply", "--check", "--", patchPath], temp);
    git(["apply", "--", "" + patchPath], temp);
    await rm(patchPath);
    const inspect = async (dir: string) => {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if ((await lstat(p)).isSymbolicLink())
          throw new Error("Symlink patches unsupported");
        if (e.isDirectory()) await inspect(p);
      }
    };
    await inspect(temp);
    return { base: sha, ...checkRepository(temp, config) };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
