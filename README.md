<div align="center">

<h1>RepoContract</h1>
<p><strong>Turn architecture rules into checks your coding agent can use.</strong></p>
<p>Find forbidden imports and dependency cycles in TypeScript repositories, with the source lines that explain each finding.</p>

<p>
  <a href="https://github.com/Balaji91221/repocontract/actions/workflows/ci.yml"><img src="https://github.com/Balaji91221/repocontract/actions/workflows/ci.yml/badge.svg" alt="GitHub Actions CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0f766e" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/Node.js-22.18%2B-339933" alt="Node.js 22.18 or newer">
  <img src="https://img.shields.io/badge/TypeScript-SDK-3178c6" alt="TypeScript SDK">
  <img src="https://img.shields.io/badge/MCP-read--only-7c3aed" alt="Read-only MCP server">
</p>

<p><a href="#why-i-built-it">Why</a> · <a href="#quick-start">Quick start</a> · <a href="#usage">Usage</a> · <a href="#architecture">Architecture</a> · <a href="#documentation">Documentation</a></p>
</div>

![RepoContract workflow: declare a boundary, inspect imports, and review source-backed violations.](docs/assets/overview.svg)

## Why I built it

As an AI engineer, I want coding assistants to respect the structure of a project as well as produce working code. A change can pass its tests while quietly bypassing the service layer or introducing a dependency cycle. Architecture notes are useful, but a reviewer still needs a way to check them.

I built RepoContract to make a small set of those rules executable. It connects a declared dependency boundary to the imports in the repository, so a developer or coding agent can see exactly where a change crosses that boundary.

**Example:** your rule says API routes must use application services. A new route imports the database directly. RepoContract reports the rule, file, import, and source line—even if the application still runs.

## What it helps you do

| Need | RepoContract provides |
|---|---|
| Preserve module boundaries | Explicit rules for forbidden imports between path prefixes |
| Inspect dependencies | TypeScript-based resolution, dependency edges, and cycle checks |
| Review an agent's patch | Checks in a disposable Git snapshot |
| Give assistants architectural context | Read-only MCP tools for rules and repository checks |
| Start from an architecture document | Reviewable rule proposals, with source evidence and explicit approval |

Useful for TypeScript maintainers, teams using coding assistants, and developers turning design decisions into CI checks.

## Quick start

Requires **Node.js 22.18+**. The basic checks need no LLM or API key.

```bash
git clone https://github.com/Balaji91221/repocontract.git
cd repocontract
npm ci
npm run build
npm run demo
```

The demo deliberately contains a forbidden route-to-database import. It reports `complete: true`, a violation with rule ID `routes-no-db`, and exits with **code 1**. This means the rule caught the example problem.

![Actual RepoContract graph report showing the forbidden import in the included fixture.](docs/assets/demo.png)

*Actual report generated from the included example repository. Findings link a declared rule to source evidence.*

## Usage

### Declare a boundary and check your repository

Save this as `rules.json` in your project:

```json
{
  "rules": [{
    "id": "routes-no-db",
    "from": "src/routes",
    "forbid": ["src/database"],
    "reason": "Routes must use application services"
  }],
  "cycles": true
}
```

From the RepoContract checkout:

```bash
node dist/cli.js check /absolute/path/to/your-project /absolute/path/to/your-project/rules.json
```

Scopes are exact relative paths or directory prefixes, not globs. Install your target project's dependencies first when imports require external resolution.

| Exit code | Meaning |
|---|---|
| `0` | Analysis completed without violations |
| `1` | Analysis completed and found violations |
| `2` | Invalid input, an analysis error, or incomplete resolution |

### Use the SDK

Version **0.2.0 is not published to npm**. Package the checkout and install the tarball in your application:

```bash
npm pack
# In your own application:
npm install /absolute/path/to/repocontract/ai-opensource-local-repocontract-0.2.0.tgz
```

```ts
import { readFileSync } from 'node:fs';
import { checkRepository } from '@ai-opensource-local/repocontract';

const rules = JSON.parse(readFileSync('./rules.json', 'utf8'));
const result = checkRepository('/absolute/path/to/your-project', rules);
console.log(result.complete, result.violations, result.errors);
```

### Connect an MCP client

Add a server entry in an MCP client that accepts `mcpServers` configuration, replacing the paths with your own:

```json
{
  "mcpServers": {
    "repocontract": {
      "command": "node",
      "args": [
        "/absolute/path/to/repocontract/dist/cli.js", "serve",
        "/absolute/path/to/your-project",
        "/absolute/path/to/your-project/rules.json"
      ]
    }
  }
}
```

The server exposes two read-only tools:

```text
get_rules({"file_path": "src/routes/orders.ts"})
check_repository({})
```

It is bound to the configured root and rules. Restart it after changing the approved rules. Rule drafting and approval use the CLI or SDK.

## Architecture

```mermaid
flowchart LR
    R[Repository files] --> T[TypeScript parser and resolver]
    T --> G[Dependency edges and errors]
    C[Approved rules] --> V[Boundary and cycle checks]
    G --> V
    V --> O[Source-backed findings]
    O --> A[CLI / SDK / MCP]
    O --> H[HTML graph report]
```

| Component | Responsibility |
|---|---|
| [`checkRepository`](src/index.ts) | Resolve static imports, evaluate boundaries, and report incomplete analysis |
| [`onboarding`](src/onboarding.ts) | Draft rules from a document; validate evidence and approval |
| [`checkPatch`](src/patch.ts) | Apply a proposed patch to a disposable Git snapshot and scan it |
| [`MCP server`](src/mcp.ts) | Expose root-bound, read-only checks to assistants |
| [`report renderer`](src/report.ts) | Display dependency edges, violations, and analysis errors |

An optional LLM can **propose** rules. Approved rules and the deterministic analyzer decide the findings. The [architecture guide](docs/architecture.md) explains the HLD, LLD, and approval flow.

## Current scope

- Static dependency analysis for supported JavaScript/TypeScript imports; it does not prove runtime architecture.
- Dynamic module paths, unresolved dependencies, and symlinks produce incomplete analysis rather than a clean pass.
- Patch checks do not modify your working tree or automatically install dependencies.
- Model-assisted proposals require explicit configuration and review. Basic checks work offline.

## Documentation

| Start here | Go deeper |
|---|---|
| [Usage, reports, and rule onboarding](docs/usage.md) | [Architecture: HLD and LLD](docs/architecture.md) |
| [Implemented features](FEATURE_MATRIX.md) | [Project plan](PROJECT_PLAN.md) |
| [Verification and release scope](IMPLEMENTATION_STATUS.md) | [Security policy](SECURITY.md) |

## Development

```bash
npm run typecheck
npm run build
npm test
npm run eval
```

See [CONTRIBUTING.md](CONTRIBUTING.md), or open a [GitHub issue](https://github.com/Balaji91221/repocontract/issues) with a small reproduction. Released under the [MIT License](LICENSE).
