# RepoContract implementation status

Version 0.2.1. See [feature matrix](FEATURE_MATRIX.md) for implemented features and their tests.

The documented features are implemented. Optional caching and baseline suppression are outside the release scope. Runtime architecture proof, universal rule inference, autonomous repair, hosting, live model benchmarking and independent pilots are not claimed.

## Verification

The project passed type checking, compilation, and all **24 tests** during local
verification. Reproduce those checks from this repository root:

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run eval
```

The held-out template evaluation, examples, and clean local package installation
were verified separately. Run `npm pack`, install the tarball in an empty project,
and import the SDK to repeat the package check. Provider adapters use controlled
endpoints in tests; no external account was configured and no live-model quality
claim is made. Check the [npm registry entry](https://www.npmjs.com/package/@kelavathbalajinaik/repocontract) for available versions.

## Public distribution

Install the compiled npm package with `npm install @kelavathbalajinaik/repocontract@0.2.1`. It includes the SDK, CLI, and TypeScript declarations. Version 0.2.1 updates packaging and install documentation; runtime behavior is unchanged from 0.2.0. The existing [v0.2.0 GitHub release](https://github.com/Balaji91221/repocontract/releases/tag/v0.2.0) remains available.
