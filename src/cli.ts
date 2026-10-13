#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  checkRepository,
  proposeRules,
  approveProposal,
  JsonProposalProvider,
  AnthropicProposalProvider,
  renderReport,
  checkPatch,
} from "./index.ts";
import { serve } from "./mcp.ts";
try {
  const [cmd = "demo", ...args] = process.argv.slice(2);
  const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
  if (cmd === "serve") {
    if (!args[0] || !args[1]) throw new Error("serve ROOT CONFIG");
    await serve(args[0], args[1]);
  } else if (cmd === "init") {
    const output = args[0] ?? "repocontract.config.json";
    writeFileSync(
      output,
      JSON.stringify({ schemaVersion: 1, rules: [], cycles: true }, null, 2) +
        "\n",
      { flag: "wx" },
    );
    console.log(output);
  } else if (cmd === "propose" || cmd === "propose-native") {
    const [documentFile, output, endpoint] = args;
    if (!documentFile || !output)
      throw new Error("propose DOCUMENT OUTPUT [JSON_ENDPOINT]");
    const p = await proposeRules(
      readFileSync(documentFile, "utf8"),
      documentFile,
      cmd === "propose-native"
        ? new AnthropicProposalProvider(
            endpoint,
            process.env.ANTHROPIC_API_KEY ?? "",
          )
        : endpoint
          ? new JsonProposalProvider(
              endpoint,
              "external-json",
              process.env.REPOCONTRACT_PROPOSAL_TOKEN,
            )
          : undefined,
    );
    writeFileSync(output, JSON.stringify(p, null, 2) + "\n", { flag: "wx" });
    console.log(
      JSON.stringify({
        proposal: output,
        documentHash: p.documentHash,
        rules: p.rules.length,
        unhandled: p.unhandled.length,
      }),
    );
  } else if (cmd === "approve") {
    const [proposal, document, expectedHash, output] = args;
    if (!output)
      throw new Error("approve PROPOSAL DOCUMENT EXPECTED_HASH OUTPUT");
    await approveProposal(read(proposal), document, expectedHash, output);
    console.log(output);
  } else if (cmd === "report") {
    const [json, html] = args;
    if (!html) throw new Error("report RESULT_JSON OUTPUT_HTML");
    writeFileSync(html, renderReport(read(json)), { flag: "wx" });
    console.log(html);
  } else if (cmd === "check-patch") {
    const [root, base, patchFile, configFile] = args;
    const r = await checkPatch(
      root,
      base,
      readFileSync(patchFile, "utf8"),
      read(configFile),
    );
    console.log(JSON.stringify(r, null, 2));
    process.exitCode = !r.complete ? 2 : r.violations.length ? 1 : 0;
  } else if (["demo", "check"].includes(cmd)) {
    const root =
      cmd === "demo"
        ? fileURLToPath(new URL("../examples/repository", import.meta.url))
        : path.resolve(args[0] ?? ".");
    const r = checkRepository(
      root,
      read(cmd === "demo" ? path.join(root, "rules.json") : args[1]),
    );
    console.log(JSON.stringify(r, null, 2));
    process.exitCode = !r.complete ? 2 : r.violations.length ? 1 : 0;
  } else
    throw new Error(
      "Commands: demo, init, check, check-patch, propose, approve, report, serve",
    );
} catch (error) {
  console.error(String(error));
  process.exitCode = 2;
}
