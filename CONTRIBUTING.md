# Contributing

## Setup

```bash
bun install
bun run test
```

## Asset snapshots

The following files in `packages/assets-humation-1` form one synchronized
asset snapshot:

- `manifest.json`
- `assets/**/*.svg`
- `src/embedded.ts`
- `src/manifest-json.ts`
- `src/manifest.ts`

When changing assets, update the raw SVG files, `manifest.json`, and generated
`src/` manifest modules together in the same PR. `packages/assets-humation-1/src/assets.test.ts`
guards their internal consistency (manifest validity, part counts, and that
every `svgPath` resolves to a real file).

Renderer code in `packages/core` is normal hand-written source and welcomes
direct changes.

`r/*.json` is built from `registry/` — edit the sources under
`registry/blocks/` and run `bun run registry:build` to regenerate.

## Before sending a PR

```bash
bun run typecheck
bun run test
bun run pack:smoke
```

## License

Source code and official Humation assets are MIT licensed. See the root
`LICENSE` and each package `LICENSE.md`.
