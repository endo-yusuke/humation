# Humation Release Checklist

This checklist tracks the checks to run before publishing Humation packages.

## Locked Decisions

- Public rendering output uses CSS custom properties only.
- Inline color materialization is not a public output mode.
- Part IDs are canonical and independent from current UI grouping.
- UI groups can change without changing public part IDs.
- A selected part can render across multiple layer fragments.
- Public packages are `@humation/core`, `@humation/assets-humation-1`,
  `@humation/react`, and `@humation/web-component`.
- Source code and official Humation assets are MIT licensed.

## Current Verification

```bash
bun run typecheck
bun run test
bun run pack:smoke
bun run release:check
```

`release:check` should pass before publishing. Any reported blocker is a real
problem.

## Before npm Publish

- Keep the root `LICENSE`, package `LICENSE.md` files, and package metadata in
  sync.
- Run `bun run release:prepare -- <version>` to preview package metadata
  changes.
- Run `bun run release:prepare -- <version> --write` only in the final publish
  commit.
- Keep `publishConfig.access` set to `public` for scoped OSS packages.
- Run package packing smoke tests for all packages.
- Confirm generated package tarballs contain `dist`, `README.md`, manifest, and
  assets as intended.
- Confirm packed package metadata does not contain `workspace:*` dependencies.
- Keep app integration as a separate validation step after OSS package behavior
  is stable.
