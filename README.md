# RepoContract

Executable dependency boundaries for TypeScript repositories. Local development release 0.2.0; not published to npm.

## Quick start and usage

```bash
git clone https://github.com/Balaji91221/repocontract.git
cd repocontract
npm ci
npm run build
npm test
npm run demo  # exits 1: deliberately forbidden route-to-database import
node dist/cli.js check /absolute/path/to/project /absolute/path/to/rules.json
```

Exit codes: 0 complete scan without violations; 1 complete scan with violations; 2 invalid input, analysis errors, or incomplete resolution. A parse failure or unresolved dependency does not silently pass.

### Configuration

```json
{
  "rules": [{
    "id": "routes-no-db",
    "from": "src/routes",
    "forbid": ["src/database"],
    "reason": "Routes must use application services",
    "reference": "docs/architecture.md"
  }],
  "cycles": true
}
```

Scopes are exact relative paths or directory prefixes, **not globs**. Use `.` for the whole repository; `./` components are rejected to prevent ambiguous matching. `src/routes` matches files below that directory; wildcards are rejected. The analyzer reads root `tsconfig.json` options, follows supported static imports/re-exports, import-equals, and literal require/import calls. It skips node_modules, .git, dist, and artifacts. Symlinks, unsupported computed module paths, and unresolved dependencies are reported as incomplete. External resolved packages are not local boundary edges. Type-only imports are included.

### SDK

```ts
import { checkRepository } from '@ai-opensource-local/repocontract';
const result = checkRepository('/absolute/path/to/repo', config);
console.log(result.complete, result.violations, result.errors);
```

Rules, dependency edges, and errors are returned as structured data. Each violation includes its rule ID, rationale, import specifier, source path, and line. The tool reads source but does not execute repository scripts. Install the target repository's dependencies separately if it requires external resolution.

## Local installation in another project

Build and package this source folder, then install the resulting tarball in your consuming project:

```bash
npm run build
npm pack
# In the consuming project:
npm install /absolute/path/to/generated-package.tgz
```

The package exports compiled JavaScript and TypeScript declarations. Node.js 22.18 or newer is required. `npm ci` uses the committed dependency lockfile. `npm run typecheck` checks the source; `npm run build` creates `dist/`. The package is marked private to prevent accidental publication. Original code is MIT licensed. Selecting an available public name and publishing remain explicit release tasks; dependencies retain their own licenses.

## Design and current scope

See [FEATURE_MATRIX.md](FEATURE_MATRIX.md) for the implemented plan phases and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verification boundaries.

## MCP connection

```bash
node /absolute/path/to/06-repocontract/dist/cli.js serve /absolute/path/to/repository /absolute/path/to/rules.json
```

Register this command and arguments in a compatible assistant's MCP server settings. The server exposes `get_rules({file_path})` and `check_repository({})`. Root and configuration are fixed at startup; tool arguments cannot change them. Configuration edits require a server restart. Protocol initialization is handled by the MCP SDK. The included integration test uses a real SDK client to list/call tools and reject paths outside the root. No assistant UI has been configured automatically.

## Assisted rule onboarding

Use an architecture document from the repository you want to check. In these
commands, `docs/architecture.md` is a caller-supplied path, not a bundled file.

```bash
node dist/cli.js init rules.json
node dist/cli.js propose docs/architecture.md draft.json
# Inspect draft.json and its documentHash before approval.
node dist/cli.js approve draft.json docs/architecture.md EXPECTED_DOCUMENT_HASH approved-rules.json
```

`init`, `propose`, `approve`, and `report` create new files exclusively. The offline template provider recognizes explicit lines such as `src/routes must not import src/database`; ambiguous prose remains in `unhandled`. Proposals carry exact source lines, document hashes, and `reviewed: false`. Approval validates the current document hash and evidence before producing executable configuration. It never rewrites architecture documents.

Optional model integration:

```bash
# Set ANTHROPIC_API_KEY first; provide an available model ID explicitly.
node dist/cli.js propose-native docs/architecture.md draft.json MODEL_ID
```

The native adapter uses [Claude structured tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls) to produce drafts. A generic JSON bridge can instead be supplied as the third argument to `propose`; its endpoint contract is documented by `JsonProposalProvider`. External calls are opt-in and send the document to the configured endpoint. Model proposals go through the same schema and exact-evidence validation, and still require approval. Local tests use controlled providers; no live model accuracy claim is made.

```bash
npm run eval
```

The committed held-out template cases include explicit, mixed, and unenforceable architecture statements. Evaluation compares proposed boundaries and unhandled statements; it is separate from model-provider contract tests.

## Proposed patches and graph reports

```bash
node dist/cli.js check-patch /path/to/repo HEAD change.diff rules.json > patch-result.json
node dist/cli.js report patch-result.json graph-report.html
```

Patch checks materialize the selected Git commit in a disposable directory and apply the supplied ordinary text patch there. They do not modify the user's checkout or include unrelated uncommitted changes. Symlinks/submodules are rejected; unresolved dependencies produce incomplete analysis. Dependencies are not automatically installed inside snapshots. The self-contained graph report supports filtering paths/rule IDs and displays source evidence and incomplete-analysis errors.

Use `checkPatch`, `proposeRules`, `approveProposal`, and `renderReport` directly from the SDK when integrating these workflows with a coding agent. MCP remains read-only with `get_rules` and `check_repository`; changing approved rules is an explicit CLI/SDK operation.

Configuration shape: [JSON Schema](schemas/rules.schema.json). Runtime validation additionally enforces cross-field deadlines, duplicate IDs and supported operations. Generated `dist/index.d.ts` exposes the current SDK.
