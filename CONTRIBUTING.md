# Contributing

Use Node.js 22.18+ and install the pinned development dependency graph with `npm ci`.
Run `npm run typecheck`, `npm run build`, and `npm test` before submitting a change.
Network/provider tests use only loopback fixtures and fake credentials; real model
calls are opt-in.

Keep domain rules in the SDK; CLI, MCP, storage and model adapters compose it.
A new adapter must preserve unknown/incomplete results, bounds and source evidence.
Add regression tests for behavior risks, update README/feature status, and keep
runtime artifacts and secrets outside source control. Use small, reviewable changes.

Run `npm pack` and install the tarball into an empty directory before release;
import the SDK and execute the installed CLI, without a workspace TypeScript loader or source imports. Retain the previous tarball and schema-versioned run data
for rollback. The public npm package is `@kelavathbalajinaik/repocontract`. Publish only the exact tarball
that passed the clean-install check, after an explicit release authorization.
Keep previous GitHub release tags and assets unchanged.
