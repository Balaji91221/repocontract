# RepoContract project plan

Executable architecture rules for coding assistants.

**Status:** Local 0.2.0 roadmap implementation delivered. See [feature matrix](FEATURE_MATRIX.md), [implementation status](IMPLEMENTATION_STATUS.md), and [actual interfaces](README.md). External pilots, live model quality and publication remain separate verification/release work. **Planning date:** 13 October 2026. Package names and interfaces below are illustrative and must be checked before publication.

## Goal and target users

TypeScript teams and open-source maintainers using coding assistants in repositories with defined module boundaries.

A route can import a database client directly while tests still pass. RepoContract checks declared architectural boundaries and provides source evidence plus the reason for each rule.

## Product hypothesis and validation

Architecture decisions linked to enforceable rules, agent-accessible guidance, and proposed-change checking. Dependency validation already exists; reuse established analysis where practical and differentiate on integration and rule lifecycle.

Before expanding the implementation, interview three to five target developers. Ask for a recent concrete failure, current workaround, and a repository or sanitized fixture they can share. A successful pilot means someone other than the author can install the tool, reproduce a useful finding, and explain why it belongs in their workflow. These are validation goals, not established demand.

## First release scope

TypeScript repository analysis with forbidden dependencies, cross-module internal access rules, and cycle detection; CLI and SDK; source-linked findings; read-only MCP tools after checks are stable.

**Out of scope:** No universal architecture inference, unsupported language coverage, proof of runtime behavior, automatic code repair, or endpoint-authentication guarantees in v1.

## Representative workflow

Developer declares and reviews rules → analyzer resolves imports → evaluator checks dependency edges → reporter emits file/line evidence → coding assistant reads applicable rules and adjusts code → CI repeats the same checks.

## High level design

```text
Source files + tsconfig -> Analyzer adapter -> Dependency graph
Approved rules -> Rule evaluator <- Dependency graph
Violations -> CLI / SDK / MCP / Local viewer
Architecture prose -> Optional LLM proposals -> Human review -> Approved rules
```

**Implementation stack:** TypeScript, established dependency analyzer where suitable, JSON Schema validated configuration, CLI and SDK, optional SQLite cache only after profiling, and a React graph viewer later.

**Architecture choice:** A custom parser offers control but creates expensive import-resolution work. Choose an analyzer adapter first and preserve unresolved edges. A prose-only assistant plugin is easy to build but cannot enforce rules, so deterministic CI checks remain central.

Keep the core as a local library with thin interface adapters. Process boundaries shown above are deliberate; do not split every module into a deployed service. A dashboard is a consumer of the core results, not the owner of domain rules.

## Low level design

| Component | Contract | Responsibility and state |
|---|---|---|
| `AnalyzerAdapter` | `analyze(root, options) -> DependencyGraph` | Resolves imports and reports unsupported/unresolved edges. |
| `ConfigLoader` | `load(path) -> RuleSet` | Validates schema versions and references. |
| `RuleEvaluator` | `evaluate(graph, rules) -> Violation[]` | Owns deterministic boundary and cycle rules. |
| `RuleGuide` | `forPath(path) -> Rule[]` | Returns applicable rules and rationale. |
| `PatchChecker` | `checkPatch(patch) -> CheckResult` | Later analyzes a disposable proposed tree. |
| `McpFacade` | `getRules/checkRepository/checkDependency` | Exposes narrow read/check operations. |

### Data and state ownership

Module(path, sourceHash); Dependency(from, to, sourceLocation, resolutionStatus); Rule(id, kind, scope, severity, reason, reference); Violation(ruleId, evidence, fingerprint); AnalysisManifest(revision, analyzerVersion, configHash, completeness). Check state: loading → analyzing → evaluating → complete | incomplete | failed.

### Invariants

An unresolved import does not become an absent dependency. All violations cite source locations. Rules are versioned and approved, not silently generated. The same engine serves CLI, SDK, and MCP. CI can fail on incomplete analysis according to explicit policy.

### Failure and concurrency behavior

Parse errors and unsupported resolution return an incomplete result. Changed-file optimization must include affected graph edges; begin with full scans. Compare file hashes before using cached results. Do not execute repository scripts to inspect imports. Proposed patches use disposable copies and cannot modify the user checkout.

## SOLID decisions

- **Single responsibility:** AnalyzerAdapter owns input interpretation; McpFacade owns its separate output or integration concern. Domain evaluation does not move into CLI handlers.
- **Open closed:** introduce a new supported adapter behind an existing contract; add new domain behavior explicitly rather than adding hidden project-name switches.
- **Liskov substitution:** adapters must preserve documented result, error, cancellation, and completeness semantics. Run the same contract fixtures against every implementation; unsupported behavior must be explicit.
- **Interface segregation:** separate inspection from mutation and execution from reporting. Consumers receive only the operations they use.
- **Dependency inversion:** domain logic consumes typed contracts; the CLI or composition root wires concrete filesystem, transport, and provider implementations. Pure transformations stay functions instead of gaining unnecessary interfaces.

## LLM system design

Optional prose-to-rule conversion is constrained to supported rule types. A developer approves generated rules. Evaluate semantic agreement against manually labeled architecture documents, including ambiguous and unenforceable statements. Enforcement never relies on a model verdict.

When optional model calls are introduced, version prompts and output schemas, validate every response, bound tokens/time/cost, and store source references. Treat retrieved files and tool output as data. Keep model output out of authorization and deterministic pass/fail decisions. Document which content leaves the machine.

## Installation and integration design

The following command names are proposed interfaces for this future project; they are not claims that published packages exist. Reserve a package name, select a license, and publish only after the clean-install gate passes.

```text
repocontract init
repocontract check
repocontract serve --root .
```

**Public SDK contract:**

```text
checkRepository({ root, configPath }): Promise<CheckResult>
```

Provide one end-to-end example with pinned supported dependencies. Keep the CLI a wrapper over the public SDK. Document configuration discovery, schema version, error categories, supported platforms, and exit codes. For check-oriented commands, distinguish success, failed checks, and incomplete/infrastructure failure. MCP integrations should expose narrow tools and validate configured roots; a plugin packages instructions and connection configuration rather than duplicating the engine.

## Repository structure

```text
src/
  core/             # Domain types, state, and evaluation
  adapters/         # External protocols, analyzers, runners, or storage
  cli/              # User commands and composition
tests/
  unit/
  integration/
  fixtures/
examples/
docs/
  decisions/
  api/
```

Add a report UI or server directory only when that milestone begins. Keep runtime artifacts and any credential files out of version control. Do not create a shared framework spanning these seven independent projects.

## Implementation roadmap

| Phase | Working deliverable | Verification gate |
|---|---|---|
| 1. Choose graph contract | Inspect one analyzer and document coverage. | Fixtures include unresolved edges and line evidence. |
| 2. Implement deterministic rules | Add forbidden edges, internal boundaries, cycles. | Rule fixtures pass without any LLM. |
| 3. Ship CLI and SDK | Add schema validation, JSON output, distinct exit codes. | Clean install checks an example repository. |
| 4. Connect decisions | Attach reason and document references to every rule. | Reports explain both evidence and intended boundary. |
| 5. Add MCP access | Expose applicable rules and repository checks. | A compatible assistant can retrieve rules and verify changes. |
| 6. Add assisted onboarding and viewer | Generate reviewable rule drafts and visual graph reports. | Held-out rule proposals are evaluated before release. |

Proceed in order. Each phase should finish with a runnable example and its verification evidence. Size the next phase after measuring the current one; no fixed delivery date is assumed.

## Testing and evaluation

Fixtures for legal boundaries, direct violations, re-exports, aliases, cycles, type-only imports, cross-module internals, unresolved packages, malformed config, and unsupported syntax. Analyzer adapters share graph contract tests.

Release gate: supported graph fixtures yield correct evidence and violations; incomplete scans never silently pass. Track analysis duration by repository size. Pilot with maintainers to assess false positives and setup effort.

Use unit tests for pure rules and integration tests at external boundaries. Maintain a held-out set for model-dependent behavior. Record run counts, versions, and incomplete cases. Do not call a system production-ready based only on seeded fixtures.

## Operations and release

- Start local-first. Log structured event IDs, durations, completeness, and errors without secrets; make detailed source capture explicit.
- Version configuration and stored artifact schemas. Validate compatibility before loading older artifacts; migrate a copy and retain the original.
- Pin supported integration versions in examples and test the documented minimum/current range before releases.
- Build distributable artifacts in CI and test installation in a clean environment. Publish release notes, a changelog, contribution instructions, and a security-reporting route.
- Roll back by pinning the previous package version. Keep baseline artifacts readable; do not overwrite them during a failed upgrade.
- A future hosted dashboard requires authentication, tenant isolation, retention/deletion controls, job quotas, and tested backups. Those are a separate release, not implicit MVP features.

## Learning outcomes

Build the deterministic core to practice data modeling and LLD. Trace the process and storage boundaries to practice HLD. Package the CLI/SDK to learn API stability and developer experience. Add model evaluation only where the product needs it. Use the optional report UI to learn full-stack integration around meaningful domain results.

## Open decisions and risks

This is a competitive area. Validate whether agent guidance and decision links improve adoption over existing analyzers. Paths do not establish runtime semantics. Authentication and business invariants need separate framework-specific designs.

Before implementation: confirm the first supported platform and dependency versions, choose a license compatible with reused code, check naming conflicts, and find pilot users. These are implementation inputs rather than reasons to expand the initial scope.

## Delivery checklist

- [ ] Product hypothesis tested with target developers
- [x] First vertical slice implemented
- [x] Local domain and integration verification gates passed
- [ ] Model-dependent behavior evaluated, if present
- [x] Clean-install example verified
- [x] Documentation and local package artifacts reviewed
- [ ] Release published
- [ ] Independent pilot completed

## Reference projects

These references are starting points for implementation-time review, not proof that the proposed differentiator is novel.

- [Dependency cruiser](https://github.com/sverweij/dependency-cruiser)
- [ArchUnit](https://www.archunit.org/)
