# RepoContract feature completion matrix

| Feature | Implementation | Evidence |
|---|---|---|
| Dependency analysis | Static JS/TS imports, aliases, modern extensions and uncertainty | `test/core.test.mjs` |
| Architecture contracts | Forbidden prefixes, internal boundaries, cycles, source rationale | `test/core.test.mjs` |
| MCP guidance | Pinned root, approved rules and repository checks | `test/mcp.test.mjs` |
| Assisted onboarding | Template/native-model/JSON proposals and hash-guarded approval | `test/onboarding.test.mjs` |
| Held-out evaluation | Eight reviewed template cases and rejection examples | `scripts/evaluate-onboarding.mjs` |
| Patch and viewer workflows | Disposable Git snapshot checking, interactive escaped graph report | `test/patch.test.mjs; test/onboarding.test.mjs` |

## Release boundary

The documented features are implemented. Optional caching and baseline suppression are outside the release scope. Runtime architecture proof, universal rule inference, autonomous repair, hosting, live model benchmarking and independent pilots are not claimed.

CI definitions, contribution/security guidance, and package-build instructions are included. A checked-in workflow is not evidence of a remote CI run.
