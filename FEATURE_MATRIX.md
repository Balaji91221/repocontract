# RepoContract feature completion matrix

| Plan feature | Implementation | Evidence |
|---|---|---|
| Dependency analysis | Static JS/TS imports, aliases, modern extensions and uncertainty | `test/core.test.mjs` |
| Architecture contracts | Forbidden prefixes, internal boundaries, cycles, source rationale | `test/core.test.mjs` |
| MCP guidance | Pinned root, approved rules and repository checks | `test/mcp.test.mjs` |
| Assisted onboarding | Template/native-model/JSON proposals and hash-guarded approval | `test/onboarding.test.mjs` |
| Held-out evaluation | Eight reviewed template cases and rejection examples | `scripts/evaluate-onboarding.mjs` |
| Patch and viewer workflows | Disposable Git snapshot checking, interactive escaped graph report | `test/patch.test.mjs; test/onboarding.test.mjs` |

## Release boundary

All local in-scope roadmap phases are implemented. Optional caching/baseline suppression are not required by the first-release plan. Runtime architecture proof, universal rule inference, autonomous repair, hosting, public publication, live model benchmarking and independent pilots are not claimed.

CI definitions, contribution/security guidance, and package-build instructions are included. A checked-in workflow is not evidence of a remote CI run.
