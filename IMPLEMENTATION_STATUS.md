# RepoContract implementation status

Local version 0.2.0. See [feature matrix](FEATURE_MATRIX.md) for every in-scope plan phase and its tests.

All local in-scope roadmap phases are implemented. Optional caching/baseline suppression are not required by the first-release plan. Runtime architecture proof, universal rule inference, autonomous repair, hosting, npm registry publication, live model benchmarking and independent pilots are not claimed.

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
claim is made. The npm package remains unpublished; that registry status is
independent of public GitHub source availability.
