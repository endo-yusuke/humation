# Humation Node Example

Minimal server-side rendering example for the OSS packages.

```bash
bun run example:node
```

The script writes:

```txt
examples/node/out/avatar.svg
examples/node/out/avatar.html
```

The generated SVG uses CSS custom properties for Humation colors. It should
contain `--hm-*` declarations on the root SVG and `var(--hm-*)` references in
part paths.
