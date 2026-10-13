# Local first implementation

The initial RepoContract implementation keeps its domain behavior in a typed library and composes CLI/adapters around it. Tests use controlled fixtures. A hosted UI and model-assisted features are deferred until the core contracts are demonstrated.

Implemented: TypeScript compiler API analyzer, forbidden-prefix rules, cross-module boundaries using those rules, cycle back-edge detection, tsconfig aliases, source evidence, CLI and typed SDK. Tests cover legal/illegal imports, comments, aliases, cycles, unsupported dynamic imports, and syntax errors. Not yet implemented: automatic rule generation, proposed-patch checking, baseline suppression, incremental caching, or graph dashboard. The analyzer detects static module edges, not runtime authorization/business semantics. CommonJS require shadowing and complex module resolution can need additional analysis; do not claim complete runtime architecture coverage.
