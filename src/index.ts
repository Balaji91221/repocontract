import { builtinModules } from "node:module";
import ts from "typescript";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
export type Config = { schemaVersion?: 1; rules: Rule[]; cycles?: boolean };
export type CheckResult = ReturnType<typeof checkRepository>;
export function validateConfig(config: Config) {
  if (!config || typeof config !== "object") throw new Error("Invalid config");
  if (config.schemaVersion !== undefined && config.schemaVersion !== 1)
    throw new Error("Unsupported config schema version");
  if (
    Object.keys(config).some(
      (k) => !["schemaVersion", "rules", "cycles"].includes(k),
    )
  )
    throw new Error("Unknown config field");
  if (!Array.isArray(config.rules)) throw new Error("rules must be an array");
  for (const r of config.rules)
    if (
      !r ||
      Object.keys(r).some(
        (k) => !["id", "from", "forbid", "reason", "reference"].includes(k),
      ) ||
      typeof r.id !== "string" ||
      !r.id.trim() ||
      typeof r.from !== "string" ||
      !Array.isArray(r.forbid) ||
      !r.forbid.every((x) => typeof x === "string") ||
      !r.forbid.length ||
      typeof r.reason !== "string" ||
      !r.reason.trim() ||
      (r.reference !== undefined && typeof r.reference !== "string")
    )
      throw new Error("Invalid rule");
  for (const r of config.rules)
    for (const scope of [r.from, ...r.forbid])
      if (
        !scope ||
        scope.includes("*") ||
        scope.includes("\\") ||
        scope.split("/").includes("..") ||
        (scope !== "." && scope.split("/").includes(".")) ||
        scope.startsWith("/") ||
        scope.includes("//") ||
        scope !== scope.trim() ||
        /[:\x00-\x1f]/.test(scope)
      )
        throw new Error(
          "Rule scopes must be relative path prefixes, not globs",
        );
  if (config.cycles !== undefined && typeof config.cycles !== "boolean")
    throw new Error("cycles must be boolean");
  if (new Set(config.rules.map((r) => r.id)).size !== config.rules.length)
    throw new Error("Duplicate rule IDs");
}

export type Rule = {
  id: string;
  from: string;
  forbid: string[];
  reason: string;
  reference?: string;
};
export type Edge = {
  from: string;
  to: string;
  line: number;
  specifier: string;
};
export function checkRepository(
  root: string,
  config: { rules: Rule[]; cycles?: boolean },
) {
  root = path.resolve(root);
  validateConfig(config);
  const files: string[] = [];
  const errors: Array<{ file: string; message: string }> = [];
  const edges: Edge[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isSymbolicLink()) {
        errors.push({
          file: path.relative(root, path.join(dir, e.name)),
          message: "Symlink not analyzed",
        });
        continue;
      }
      if (e.isDirectory()) {
        if (!["node_modules", ".git", "dist", "artifacts"].includes(e.name))
          walk(path.join(dir, e.name));
      } else if (/\.(?:[cm]?[jt]s|[jt]sx)$/.test(e.name))
        files.push(path.join(dir, e.name));
    }
  };
  walk(root);
  let options: ts.CompilerOptions = {
    allowJs: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
  };
  const configFile = path.join(root, "tsconfig.json");
  if (existsSync(configFile)) {
    const parsed = ts.readConfigFile(configFile, ts.sys.readFile);
    if (parsed.error)
      errors.push({
        file: "tsconfig.json",
        message: ts.flattenDiagnosticMessageText(parsed.error.messageText, " "),
      });
    else {
      const parsedConfig = ts.parseJsonConfigFileContent(
        parsed.config,
        ts.sys,
        root,
      );
      options = { ...options, ...parsedConfig.options };
      for (const err of parsedConfig.errors)
        if (err.code !== 18003)
          errors.push({
            file: "tsconfig.json",
            message: ts.flattenDiagnosticMessageText(err.messageText, " "),
          });
    }
  }
  const relative = (f: string) =>
    path.relative(root, f).split(path.sep).join("/");
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const error of (source as any).parseDiagnostics ?? [])
      errors.push({
        file: relative(file),
        message: ts.flattenDiagnosticMessageText(error.messageText, " "),
      });
    const visit = (node: ts.Node) => {
      let literal: ts.Expression | undefined;
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
        literal = node.argument.literal;
      else if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
        literal = node.moduleSpecifier;
      else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference)
      )
        literal = node.moduleReference.expression;
      else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require"))
      ) {
        literal = node.arguments[0];
        if (!literal || !ts.isStringLiteralLike(literal))
          errors.push({
            file: relative(file),
            message: "Dynamic module path cannot be resolved statically",
          });
      }
      if (literal && ts.isStringLiteralLike(literal)) {
        const specifier = literal.text;
        const resolved = ts.resolveModuleName(
          specifier,
          file,
          options,
          ts.sys,
        ).resolvedModule;
        if (resolved) {
          const target = relative(resolved.resolvedFileName);
          if (target.startsWith("../") || path.isAbsolute(target)) {
            if (!resolved.isExternalLibraryImport || specifier.startsWith("."))
              errors.push({
                file: relative(file),
                message: `Import escapes root: ${specifier}`,
              });
          } else if (!target.split("/").includes("node_modules")) {
            edges.push({
              from: relative(file),
              to: target,
              line:
                source.getLineAndCharacterOfPosition(literal.getStart(source))
                  .line + 1,
              specifier,
            });
          }
        } else if (
          !builtinModules.includes(specifier) &&
          !builtinModules.includes(specifier.replace(/^node:/, ""))
        )
          errors.push({
            file: relative(file),
            message: `Unresolved import: ${specifier}`,
          });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  const matches = (file: string, prefix: string) =>
    prefix === "." ||
    file === prefix ||
    file.startsWith(prefix.replace(/\/$/, "") + "/");
  const violations: Array<{
    ruleId: string;
    reason: string;
    reference?: string;
    edge: Edge;
  }> = [];
  for (const edge of edges)
    for (const rule of config.rules)
      if (
        matches(edge.from, rule.from) &&
        rule.forbid.some((p) => matches(edge.to, p))
      )
        violations.push({
          ruleId: rule.id,
          reason: rule.reason,
          reference: rule.reference,
          edge,
        });
  if (config.cycles) {
    const adjacency = new Map<string, Edge[]>();
    for (const edge of edges)
      adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge]);
    const visited = new Set<string>(),
      active = new Set<string>();
    const dfs = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);
      active.add(node);
      for (const edge of adjacency.get(node) ?? []) {
        if (active.has(edge.to))
          violations.push({
            ruleId: "no-cycles",
            reason: "Dependency closes a cycle",
            edge,
          });
        else dfs(edge.to);
      }
      active.delete(node);
    };
    for (const f of adjacency.keys()) dfs(f);
  }
  return {
    schemaVersion: 1,
    complete: errors.length === 0,
    files: files.length,
    edges,
    violations,
    errors,
  };
}

export {
  proposeRules,
  approveProposal,
  TemplateProposalProvider,
  JsonProposalProvider,
  AnthropicProposalProvider,
} from "./onboarding.ts";
export { renderReport } from "./report.ts";
export { checkPatch } from "./patch.ts";
